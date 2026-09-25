import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { E2E_WEBHOOK_SECRET } from './e2e-env';
import {
  approve,
  CLEIDE,
  lastLinkTo,
  MARINA,
  register,
  signInOperator,
  tokenOf,
} from './e2e-fixtures';

const PASSWORD = 'MinhaSenha!2026';
const DAY_MS = 24 * 60 * 60 * 1000;

type Outcome = 'LIBERADO' | 'CANCELADO' | null;

/*
  As vendas entram pelo mesmo caminho de produção: o webhook assinado da Porto.
  Literal no banco pularia justamente o que o extrato precisa conferir — que o
  que a Porto mandou é o que o afiliado vê.
*/
describe('Affiliate wallet and referrals (e2e)', () => {
  let e2e: E2eApp;
  let operatorToken: string;

  function api() {
    return request(e2e.app.getHttpServer());
  }

  function notify(body: object) {
    const raw = JSON.stringify(body);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', E2E_WEBHOOK_SECRET)
      .update(`${timestamp}.${raw}`)
      .digest('hex');

    return api()
      .post('/v1/webhooks/porto/incentives')
      .set('Content-Type', 'application/json')
      .set('X-Timestamp', timestamp)
      .set('X-Signature', `sha256=${signature}`)
      .send(raw)
      .expect(200);
  }

  /** Registra a venda e, se houver desfecho, encerra. */
  async function sale(
    cupom: string,
    item: string,
    outcome: Outcome,
    { daysAgo = 1, valor = 27 }: { daysAgo?: number; valor?: number } = {},
  ): Promise<void> {
    const venda = {
      id: randomUUID(),
      cupom,
      valorVenda: valor * 10,
      item,
      dataVenda: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
    };
    const event = (tipoEvento: string, status: string) => ({
      idEvento: randomUUID(),
      dataHoraEvento: new Date().toISOString(),
      evento: { tipoEvento },
      incentivo: { status, valor },
      venda,
    });

    await notify(event('VENDA_REGISTRADA', 'PENDENTE'));
    if (outcome === 'LIBERADO') await notify(event('VENDA_CONCLUIDA', 'LIBERADO'));
    if (outcome === 'CANCELADO') await notify(event('VENDA_NAO_CONCLUIDA', 'CANCELADO'));
  }

  /** Aprova, cria a senha pelo link do e-mail e entra. */
  async function signedIn(affiliate: {
    email: string;
  }): Promise<{ token: string; coupon: string }> {
    const coupon = await approve(e2e.app, operatorToken, await register(e2e.app, affiliate));
    await api()
      .post('/v1/affiliate/auth/set-password')
      .send({ token: tokenOf(lastLinkTo(e2e.mail, affiliate.email)), password: PASSWORD })
      .expect(204);
    const login = await api()
      .post('/v1/affiliate/auth/login')
      .send({ email: affiliate.email, password: PASSWORD })
      .expect(200);

    return { token: login.body.accessToken, coupon };
  }

  function wallet(token: string) {
    return api().get('/v1/affiliate/me/wallet').set('Authorization', `Bearer ${token}`);
  }

  function referrals(token: string, period = 'ALL') {
    return api()
      .get('/v1/affiliate/me/referrals')
      .query({ period })
      .set('Authorization', `Bearer ${token}`);
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    operatorToken = await signInOperator(e2e.app, e2e.dataSource);
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('shows every sale of the coupon, canceled included, and sums only what settled', async () => {
    const { token, coupon } = await signedIn(MARINA);
    await sale(coupon, 'Conserto de fogão', 'LIBERADO', { daysAgo: 3, valor: 27 });
    await sale(coupon, 'Guincho 24h', null, { daysAgo: 2, valor: 38 });
    await sale(coupon, 'Eletricista', 'CANCELADO', { daysAgo: 1, valor: 26 });

    const response = await referrals(token).expect(200);

    expect(
      response.body.entries.map((entry: { service: string; status: string }) => [
        entry.service,
        entry.status,
      ]),
    ).toEqual([
      ['Eletricista', 'CANCELED'],
      ['Guincho 24h', 'PENDING'],
      ['Conserto de fogão', 'COMPLETED'],
    ]);
    expect(response.body.summary).toEqual({
      salesCents: 27000,
      salesCount: 1,
      confirmedIncentiveCents: 2700,
      pendingIncentiveCents: 3800,
      couponUses: 3,
    });
  });

  it('fills the wallet only with released incentives', async () => {
    const { token, coupon } = await signedIn(MARINA);
    await sale(coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    await sale(coupon, 'Guincho 24h', null, { valor: 38 });
    await sale(coupon, 'Eletricista', 'CANCELADO', { valor: 26 });

    const response = await wallet(token).expect(200);

    expect(response.body).toEqual({
      releasedCents: 2700,
      updatedAt: expect.any(String),
      entries: [
        {
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          kind: 'INCENTIVE',
          title: 'Conserto de fogão',
          cents: 2700,
          occurredAt: expect.any(String),
        },
      ],
    });
  });

  /* O dinheiro de um afiliado não aparece na tela de outro. */
  it('never shows the sales of another affiliate', async () => {
    const marina = await signedIn(MARINA);
    const cleide = await signedIn(CLEIDE);
    await sale(cleide.coupon, 'Chaveiro', 'LIBERADO');

    const [marinaWallet, marinaReferrals] = await Promise.all([
      wallet(marina.token).expect(200),
      referrals(marina.token).expect(200),
    ]);

    expect(marinaWallet.body.entries).toEqual([]);
    expect(marinaReferrals.body.entries).toEqual([]);
    expect(marinaReferrals.body.summary.couponUses).toBe(0);
  });

  it('cuts the list by when the sale happened, keeping the summary whole', async () => {
    const { token, coupon } = await signedIn(MARINA);
    await sale(coupon, 'Chaveiro', 'LIBERADO', { daysAgo: 45 });
    await sale(coupon, 'Encanador', 'LIBERADO', { daysAgo: 5 });

    const response = await referrals(token, 'LAST_30_DAYS').expect(200);

    expect(response.body.entries.map((entry: { service: string }) => entry.service)).toEqual([
      'Encanador',
    ]);
    expect(response.body.summary.salesCount).toBe(2);
  });

  it('refuses a period it does not know', async () => {
    const { token } = await signedIn(MARINA);

    await referrals(token, 'SEMANA').expect(400);
  });
});

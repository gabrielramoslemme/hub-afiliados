import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { E2E_TRANSFEERA_WEBHOOK_SECRET } from './e2e-env';
import { MARINA, settleSale, signInAffiliate, signInOperator } from './e2e-fixtures';

describe('Transfeera webhook (e2e)', () => {
  let e2e: E2eApp;
  let token: string;
  let withdrawalId: string;
  let affiliateCoupon: string;

  function api() {
    return request(e2e.app.getHttpServer());
  }

  function wallet() {
    return request(e2e.app.getHttpServer())
      .get('/v1/affiliate/me/wallet')
      .set('Authorization', `Bearer ${token}`);
  }

  function transfeera(body: object | string, secret = E2E_TRANSFEERA_WEBHOOK_SECRET) {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const timestamp = Date.now();
    const signature = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');

    return api()
      .post('/v1/webhooks/transfeera')
      .set('Content-Type', 'application/json')
      .set('Transfeera-Signature', `t=${timestamp},v1=${signature}`)
      .send(raw);
  }

  function transferEvent(status: string, integrationId = withdrawalId) {
    return {
      id: randomUUID(),
      version: 'v1',
      object: 'Transfer',
      date: new Date().toISOString(),
      data: {
        id: 60040,
        integration_id: integrationId,
        status,
        status_description: status === 'DEVOLVIDO' ? 'Conta encerrada' : null,
        receipt_url: status === 'FINALIZADO' ? 'https://cdn.transfeera.com/r/60040.pdf' : null,
        pix_end2end_id: status === 'FINALIZADO' ? 'E1234567820260925' : null,
        batch_id: 1426,
        destination_bank_account: {
          cpf_cnpj: '529.982.247-25',
          pix_key: MARINA.pixKey,
          pix_key_type: 'EMAIL',
        },
      },
    };
  }

  async function trail(): Promise<Array<{ outcome: string; payload: unknown }>> {
    return e2e.dataSource.query(`SELECT "outcome", "payload" FROM "payout_events" ORDER BY "id"`);
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    const operatorToken = await signInOperator(e2e.app, e2e.dataSource);
    const affiliate = await signInAffiliate(e2e, operatorToken, MARINA);
    token = affiliate.token;
    affiliateCoupon = affiliate.coupon;
    await settleSale(e2e.app, affiliate.coupon, 'Conserto de fogão', 'LIBERADO', { valor: 40 });
    const withdrawal = await api()
      .post('/v1/affiliate/me/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    withdrawalId = withdrawal.body.id;
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('refuses a call without a valid signature', async () => {
    await api().post('/v1/webhooks/transfeera').send(transferEvent('FINALIZADO')).expect(401);
    await transfeera(transferEvent('FINALIZADO'), 'another-secret').expect(401);
  });

  it('answers the url check of an empty body without recording anything', async () => {
    await transfeera('{}').expect(200);

    expect(await trail()).toEqual([]);
  });

  it('marks the withdrawal paid and tells the affiliate, once', async () => {
    const first = await transfeera(transferEvent('FINALIZADO')).expect(200);
    const repeated = await transfeera(transferEvent('FINALIZADO')).expect(200);

    expect(first.body.outcome).toBe('APPLIED');
    expect(repeated.body.outcome).toBe('DUPLICATE');
    const paidMails = e2e.mail
      .sentTo(MARINA.email)
      .filter((mail) => mail.subject === 'Seu saque via PIX foi pago');
    expect(paidMails).toHaveLength(1);
    expect(paidMails[0].text).toContain('40,00');

    const paid = await wallet().expect(200);
    expect(paid.body.withdrawnCents).toBe(4000);
    expect(paid.body.entries[0]).toEqual(
      expect.objectContaining({
        withdrawalStatus: 'PAID',
        receiptUrl: 'https://cdn.transfeera.com/r/60040.pdf',
      }),
    );
  });

  it('never keeps the pix key or the cpf in the trail', async () => {
    await transfeera(transferEvent('FINALIZADO')).expect(200);

    const text = JSON.stringify(await trail());
    expect(text).not.toContain(MARINA.pixKey);
    expect(text).not.toContain('529.982.247-25');
  });

  it('gives the balance back when the pix is returned after being paid', async () => {
    await transfeera(transferEvent('FINALIZADO')).expect(200);
    await transfeera(transferEvent('DEVOLVIDO')).expect(200);

    const again = await api()
      .post('/v1/affiliate/me/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(again.body.amountCents).toBe(4000);
    expect(
      e2e.mail
        .sentTo(MARINA.email)
        .some((mail) => mail.subject === 'Seu saque via PIX foi devolvido'),
    ).toBe(true);
  });

  // O PIX recusado devolveu as vendas ao saldo; um FINALIZADO depois disso é
  // dinheiro fora do lugar — a trilha guarda, o saldo não muda, alguém confere.
  it('flags a payment arriving on a failed withdrawal as divergent, without touching the balance', async () => {
    await settleSale(e2e.app, affiliateCoupon, 'Troca de chuveiro', 'LIBERADO', { valor: 27 });
    e2e.payouts.respondNext('refuse');
    await api()
      .post('/v1/affiliate/me/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    const [failed] = await e2e.dataSource.query(
      `SELECT "public_id" FROM "affiliate_withdrawals" WHERE "status" = 'FAILED'`,
    );
    const before = (await wallet().expect(200)).body;

    const response = await transfeera(transferEvent('FINALIZADO', failed.public_id)).expect(200);

    expect(response.body.outcome).toBe('DIVERGENT');
    const after = (await wallet().expect(200)).body;
    expect(after.availableCents).toBe(before.availableCents);
    expect(after.withdrawnCents).toBe(before.withdrawnCents);
    const [row] = await e2e.dataSource.query(
      `SELECT "status" FROM "affiliate_withdrawals" WHERE "public_id" = $1`,
      [failed.public_id],
    );
    expect(row.status).toBe('FAILED');
    expect((await trail()).map((event) => event.outcome)).toEqual(['DIVERGENT']);
  });

  it('keeps the pix key and a cpf quoted by the provider out of the reason and the trail', async () => {
    const event = transferEvent('DEVOLVIDO');
    event.data.status_description = `Chave ${MARINA.pixKey} não pertence ao CPF 529.982.247-25`;

    await transfeera(event).expect(200);

    const [row] = await e2e.dataSource.query(
      `SELECT "status", "failure_reason" FROM "affiliate_withdrawals" WHERE "public_id" = $1`,
      [withdrawalId],
    );
    expect(row.status).toBe('RETURNED');
    for (const text of [row.failure_reason, JSON.stringify(await trail())]) {
      expect(text).not.toContain(MARINA.pixKey);
      expect(text).not.toContain('529.982.247-25');
    }
    expect(row.failure_reason).toContain('não pertence');
  });

  // Um id numérico invalidava o corpo inteiro: o evento virava "sem efeito",
  // respondia 200 e a Transfeera nunca mais mandava.
  it('applies an event whose top-level id comes as a number', async () => {
    const response = await transfeera({ ...transferEvent('FINALIZADO'), id: 918273 }).expect(200);

    expect(response.body.outcome).toBe('APPLIED');
    const [event] = await e2e.dataSource.query(`SELECT "event_id" FROM "payout_events"`);
    expect(event.event_id).toBe('918273');
  });

  it('answers 404 for a reference that is no withdrawal, even when it is not a uuid', async () => {
    await transfeera(transferEvent('FINALIZADO', randomUUID())).expect(404);
    await transfeera(transferEvent('FINALIZADO', 'lote-manual-42')).expect(404);

    expect((await trail()).map((row) => row.outcome)).toEqual([
      'UNKNOWN_WITHDRAWAL',
      'UNKNOWN_WITHDRAWAL',
    ]);
  });

  it('records intermediate statuses and other objects without changing the withdrawal', async () => {
    const created = await transfeera(transferEvent('CRIADA')).expect(200);
    const other = await transfeera({ id: randomUUID(), object: 'Billet', data: {} }).expect(200);

    expect(created.body.outcome).toBe('IGNORED');
    expect(other.body.outcome).toBe('IGNORED');
    await transfeera(transferEvent('FINALIZADO')).expect(200);
    expect(
      e2e.mail.sentTo(MARINA.email).some((m) => m.subject === 'Seu saque via PIX foi pago'),
    ).toBe(true);
  });
});

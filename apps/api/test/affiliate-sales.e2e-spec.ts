import request from 'supertest';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { CLEIDE, MARINA, settleSale, signInAffiliate, signInOperator } from './e2e-fixtures';

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
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO', { daysAgo: 3, valor: 27 });
    await settleSale(e2e.app, coupon, 'Guincho 24h', null, { daysAgo: 2, valor: 38 });
    await settleSale(e2e.app, coupon, 'Eletricista', 'CANCELADO', { daysAgo: 1, valor: 26 });

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
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    await settleSale(e2e.app, coupon, 'Guincho 24h', null, { valor: 38 });
    await settleSale(e2e.app, coupon, 'Eletricista', 'CANCELADO', { valor: 26 });

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
    const marina = await signInAffiliate(e2e, operatorToken, MARINA);
    const cleide = await signInAffiliate(e2e, operatorToken, CLEIDE);
    await settleSale(e2e.app, cleide.coupon, 'Chaveiro', 'LIBERADO');

    const [marinaWallet, marinaReferrals] = await Promise.all([
      wallet(marina.token).expect(200),
      referrals(marina.token).expect(200),
    ]);

    expect(marinaWallet.body.entries).toEqual([]);
    expect(marinaReferrals.body.entries).toEqual([]);
    expect(marinaReferrals.body.summary.couponUses).toBe(0);
  });

  it('cuts the list by when the sale happened, keeping the summary whole', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Chaveiro', 'LIBERADO', { daysAgo: 45 });
    await settleSale(e2e.app, coupon, 'Encanador', 'LIBERADO', { daysAgo: 5 });

    const response = await referrals(token, 'LAST_30_DAYS').expect(200);

    expect(response.body.entries.map((entry: { service: string }) => entry.service)).toEqual([
      'Encanador',
    ]);
    expect(response.body.summary.salesCount).toBe(2);
  });

  it('refuses a period it does not know', async () => {
    const { token } = await signInAffiliate(e2e, operatorToken, MARINA);

    await referrals(token, 'SEMANA').expect(400);
  });
});

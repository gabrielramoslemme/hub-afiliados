import request from 'supertest';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { CLEIDE, MARINA, settleSale, signInAffiliate, signInOperator } from './e2e-fixtures';

/*
  O saque do começo ao fim pela rota, com a Transfeera falsa: a soma, a
  reserva, a corrida e o que acontece com o saldo em cada resposta dela.
*/
describe('Affiliate withdrawals (e2e)', () => {
  let e2e: E2eApp;
  let operatorToken: string;

  function withdraw(token: string) {
    return request(e2e.app.getHttpServer())
      .post('/v1/affiliate/me/withdrawals')
      .set('Authorization', `Bearer ${token}`);
  }

  function wallet(token: string) {
    return request(e2e.app.getHttpServer())
      .get('/v1/affiliate/me/wallet')
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

  it('withdraws every released incentive, and only those, to the registered key', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    await settleSale(e2e.app, coupon, 'Guincho 24h', 'LIBERADO', { valor: 13 });
    await settleSale(e2e.app, coupon, 'Eletricista', null, { valor: 26 });
    await settleSale(e2e.app, coupon, 'Encanador', 'CANCELADO', { valor: 9 });

    const response = await withdraw(token).expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      status: 'PROCESSING',
      amountCents: 4000,
      requestedAt: expect.any(String),
    });
    expect(e2e.payouts.requests).toEqual([
      {
        reference: response.body.id,
        amountCents: 4000,
        pixKeyType: 'EMAIL',
        pixKey: MARINA.pixKey,
        holderCpf: '52998224725',
      },
    ]);
  });

  it('leaves nothing to withdraw right after a withdrawal', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO');
    await withdraw(token).expect(201);

    const response = await withdraw(token).expect(409);

    expect(response.body.code).toBe('WDR-001');
  });

  it('pays once when the same affiliate asks twice at the same time', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO');

    const statuses = (await Promise.all([withdraw(token), withdraw(token)]))
      .map((response) => response.status)
      .sort();

    expect(statuses).toEqual([201, 409]);
    expect(e2e.payouts.requests).toHaveLength(1);
  });

  it('gives the balance back when the provider refuses the pix', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    e2e.payouts.respondNext('refuse');

    expect((await withdraw(token).expect(409)).body.code).toBe('WDR-002');

    const retry = await withdraw(token).expect(201);
    expect(retry.body.amountCents).toBe(2700);
  });

  it('keeps the balance reserved while the provider has not answered', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO');
    e2e.payouts.respondNext('unavailable');

    expect((await withdraw(token).expect(202)).body.status).toBe('REQUESTED');
    expect((await withdraw(token).expect(409)).body.code).toBe('WDR-001');
  });

  it('refuses while payouts are off, without reserving the balance', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO');
    e2e.payouts.enabled = false;

    expect((await withdraw(token).expect(503)).body.code).toBe('WDR-003');

    e2e.payouts.enabled = true;
    await withdraw(token).expect(201);
  });

  it('never touches the sales of another affiliate', async () => {
    const marina = await signInAffiliate(e2e, operatorToken, MARINA);
    const cleide = await signInAffiliate(e2e, operatorToken, CLEIDE);
    await settleSale(e2e.app, marina.coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    await settleSale(e2e.app, cleide.coupon, 'Guincho 24h', 'LIBERADO', { valor: 13 });

    expect((await withdraw(marina.token).expect(201)).body.amountCents).toBe(2700);
    expect((await withdraw(cleide.token).expect(201)).body.amountCents).toBe(1300);
  });

  it('refuses a panel session', async () => {
    await withdraw(operatorToken).expect(403);
  });

  it('moves the balance to in flight on request and shows the withdrawal in the statement', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    await withdraw(token).expect(201);

    const response = await wallet(token).expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ availableCents: 0, withdrawnCents: 0, inFlightCents: 2700 }),
    );
    expect(response.body.entries[0]).toEqual(
      expect.objectContaining({
        kind: 'PAYOUT',
        title: 'Saque via PIX',
        cents: 2700,
        withdrawalStatus: 'PROCESSING',
      }),
    );
  });

  it('shows a refused withdrawal in the statement and its amount back in the balance', async () => {
    const { token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA);
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    e2e.payouts.respondNext('refuse');
    await withdraw(token).expect(409);

    const response = await wallet(token).expect(200);

    expect(response.body.availableCents).toBe(2700);
    expect(response.body.inFlightCents).toBe(0);
    expect(response.body.entries[0].withdrawalStatus).toBe('FAILED');
  });
});

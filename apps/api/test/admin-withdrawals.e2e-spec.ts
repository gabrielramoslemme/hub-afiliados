import request from 'supertest';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { CLEIDE, MARINA, settleSale, signInAffiliate, signInOperator } from './e2e-fixtures';

describe('Admin withdrawals (e2e)', () => {
  let e2e: E2eApp;
  let operatorToken: string;
  let marinaToken: string;
  let marinaWithdrawal: string;

  function api() {
    return request(e2e.app.getHttpServer());
  }

  function list(query: Record<string, string> = {}) {
    return api()
      .get('/v1/admin/withdrawals')
      .query(query)
      .set('Authorization', `Bearer ${operatorToken}`);
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    operatorToken = await signInOperator(e2e.app, e2e.dataSource);

    const marina = await signInAffiliate(e2e, operatorToken, MARINA);
    const cleide = await signInAffiliate(e2e, operatorToken, CLEIDE);
    marinaToken = marina.token;
    await settleSale(e2e.app, marina.coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    await settleSale(e2e.app, cleide.coupon, 'Guincho 24h', 'LIBERADO', { valor: 13 });

    marinaWithdrawal = (
      await api()
        .post('/v1/affiliate/me/withdrawals')
        .set('Authorization', `Bearer ${marina.token}`)
    ).body.id;
    e2e.payouts.respondNext('refuse');
    await api().post('/v1/affiliate/me/withdrawals').set('Authorization', `Bearer ${cleide.token}`);
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('lists every withdrawal, newest first, with the cpf masked and no pix key', async () => {
    const response = await list().expect(200);

    expect(response.body.total).toBe(2);
    expect(response.body.data.map((row: { affiliateName: string }) => row.affiliateName)).toEqual([
      'Cleide Nakamura',
      'Marina Ferraz',
    ]);
    expect(response.body.data[1].maskedCpf).toBe('***.***.247-25');
    const text = JSON.stringify(response.body);
    expect(text).not.toContain('52998224725');
    expect(text).not.toContain(MARINA.pixKey);
    expect(text).not.toContain('"id":');
  });

  it('filters by status, by name, by cpf typed with punctuation and by day', async () => {
    const failed = await list({ status: 'FAILED' }).expect(200);
    const byName = await list({ search: 'marina' }).expect(200);
    const byCpf = await list({ search: '529.982.247-25' }).expect(200);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    );
    const fromToday = await list({ from: today }).expect(200);
    const untilYesterday = await list({ until: '2026-01-01' }).expect(200);

    expect(failed.body.data.map((row: { affiliateName: string }) => row.affiliateName)).toEqual([
      'Cleide Nakamura',
    ]);
    expect(byName.body.total).toBe(1);
    expect(byCpf.body.data[0].affiliateName).toBe('Marina Ferraz');
    expect(fromToday.body.total).toBe(2);
    expect(untilYesterday.body.total).toBe(0);
  });

  it('pages the list', async () => {
    const response = await list({ limit: '1', page: '2' }).expect(200);

    expect(response.body).toEqual(expect.objectContaining({ total: 2, page: 2, limit: 1 }));
    expect(response.body.data).toHaveLength(1);
  });

  it('refuses a malformed filter', async () => {
    await list({ from: '25/09/2026' }).expect(400);
    await list({ status: 'LOST' }).expect(400);
  });

  it('shows the detail with the masked key and the sales it paid', async () => {
    const response = await api()
      .get(`/v1/admin/withdrawals/${marinaWithdrawal}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'PROCESSING',
        amountCents: 2700,
        pixKeyType: 'EMAIL',
        sales: [expect.objectContaining({ item: 'Conserto de fogão', incentiveCents: 2700 })],
        events: [],
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain(MARINA.pixKey);
  });

  it('answers 404 for an unknown withdrawal and 400 for an id that is no uuid', async () => {
    await api()
      .get('/v1/admin/withdrawals/40000000-0000-4000-8000-000000000099')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(404);
    await api()
      .get('/v1/admin/withdrawals/42')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(400);
  });

  it('refuses an affiliate session', async () => {
    await api()
      .get('/v1/admin/withdrawals')
      .set('Authorization', `Bearer ${marinaToken}`)
      .expect(403);
  });
});

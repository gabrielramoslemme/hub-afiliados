import request from 'supertest';
import { WithdrawalStatusEnum } from '@porto/contracts';
import { ReconcileWithdrawalsUseCase } from '../src/application/withdrawals/reconcile-withdrawals.use-case';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { MARINA, settleSale, signInAffiliate, signInOperator } from './e2e-fixtures';

/*
  A rodada da reconciliação contra o banco de verdade: o que `listStale` escolhe
  e a reivindicação que manda cada saque para o fim da fila. O cron não sobe no
  e2e; a rodada entra pelo use case, como o job a chama.
*/
describe('Withdrawal reconciliation (e2e)', () => {
  const ROUND = { retryAfterMinutes: 5, staleAfterMinutes: 120, limit: 1 };

  let e2e: E2eApp;
  let token: string;
  let coupon: string;

  function reconcile() {
    return e2e.app.get(ReconcileWithdrawalsUseCase).execute(ROUND);
  }

  async function requestWithdrawal(): Promise<string> {
    const response = await request(e2e.app.getHttpServer())
      .post('/v1/affiliate/me/withdrawals')
      .set('Authorization', `Bearer ${token}`);

    return response.body.id;
  }

  async function ageBy(publicId: string, minutes: number): Promise<void> {
    await e2e.dataSource.query(
      `UPDATE "affiliate_withdrawals"
          SET "updated_at" = now() - make_interval(mins => $2)
        WHERE "public_id" = $1`,
      [publicId, minutes],
    );
  }

  async function statusOf(publicId: string): Promise<string> {
    const [row] = await e2e.dataSource.query(
      `SELECT "status" FROM "affiliate_withdrawals" WHERE "public_id" = $1`,
      [publicId],
    );

    return row.status;
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    const operatorToken = await signInOperator(e2e.app, e2e.dataSource);
    ({ token, coupon } = await signInAffiliate(e2e, operatorToken, MARINA));
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  // Sem a reivindicação, o saque que a tentativa não fecha voltaria à frente da
  // fila a cada rodada, e os mais novos nunca seriam reenviados.
  it('sends a withdrawal the round did not close to the back of the line', async () => {
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO', { valor: 27 });
    e2e.payouts.respondNext('unavailable');
    const older = await requestWithdrawal();
    await settleSale(e2e.app, coupon, 'Guincho 24h', 'LIBERADO', { valor: 13 });
    e2e.payouts.respondNext('unavailable');
    const newer = await requestWithdrawal();
    await ageBy(older, 20);
    await ageBy(newer, 10);

    e2e.payouts.respondNext('unavailable');
    await reconcile();
    await reconcile();

    expect(e2e.payouts.requests.map((sent) => sent.reference)).toEqual([
      older,
      newer,
      older,
      newer,
    ]);
    expect(await statusOf(older)).toBe(WithdrawalStatusEnum.REQUESTED);
    expect(await statusOf(newer)).toBe(WithdrawalStatusEnum.PROCESSING);
  });

  it('leaves alone a requested withdrawal still inside the retry wait', async () => {
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO');
    e2e.payouts.respondNext('unavailable');
    await requestWithdrawal();

    await reconcile();

    expect(e2e.payouts.requests).toHaveLength(1);
  });

  it('settles a processing withdrawal from its batch when the webhook never came', async () => {
    await settleSale(e2e.app, coupon, 'Conserto de fogão', 'LIBERADO');
    const withdrawal = await requestWithdrawal();
    const [{ provider_batch_id: batchId }] = await e2e.dataSource.query(
      `SELECT "provider_batch_id" FROM "affiliate_withdrawals" WHERE "public_id" = $1`,
      [withdrawal],
    );
    e2e.payouts.settleBatch(batchId, {
      reference: withdrawal,
      status: WithdrawalStatusEnum.PAID,
      providerStatus: 'FINALIZADO',
      providerTransferId: '60040',
      endToEndId: 'E1234567820260925',
      receiptUrl: 'https://cdn.transfeera.com/r/60040.pdf',
      failureReason: null,
      payload: {},
    });
    await ageBy(withdrawal, 180);

    const result = await reconcile();

    expect(result.settled).toBe(1);
    expect(await statusOf(withdrawal)).toBe(WithdrawalStatusEnum.PAID);
  });
});

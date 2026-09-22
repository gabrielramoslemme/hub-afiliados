/**
 * @jest-environment node
 */
import {
  type AffiliateReferralsResponse,
  type AffiliateWalletResponse,
  ReferralPeriodEnum,
  ReferralStatusEnum,
  StatementEntryKindEnum,
} from '@porto/contracts';

const BASE = 'http://localhost:3000/v1';

/** Cada teste recarrega o módulo: o dublê não pode herdar estado do anterior. */
async function api() {
  const { mockApiFetch } = await import('./mock-api');

  return mockApiFetch;
}

beforeEach(() => {
  jest.resetModules();
});

describe('mockApiFetch', () => {
  it('lets a request outside the admin channel through to the real api', async () => {
    const send = await api();

    await expect(send(`${BASE}/affiliates`, { method: 'POST' })).resolves.toBeNull();
  });

  it('lets the admin channel through to the real api', async () => {
    const send = await api();

    await expect(send(`${BASE}/admin/affiliates`)).resolves.toBeNull();
    await expect(send(`${BASE}/admin/auth/login`, { method: 'POST' })).resolves.toBeNull();
  });

  describe('affiliate channel', () => {
    it('lets login and the account through to the real api', async () => {
      const send = await api();

      await expect(send(`${BASE}/affiliate/auth/login`, { method: 'POST' })).resolves.toBeNull();
      await expect(send(`${BASE}/affiliate/me`)).resolves.toBeNull();
    });

    it('answers an unmapped wallet route instead of letting it escape', async () => {
      const send = await api();
      const response = await send(`${BASE}/affiliate/me/wallet/extrato`);

      expect(response?.status).toBe(404);
    });
  });

  describe('referrals', () => {
    async function referrals(query = ''): Promise<AffiliateReferralsResponse> {
      const send = await api();
      const response = await send(`${BASE}/affiliate/me/referrals${query}`);

      return (await response?.json()) as AffiliateReferralsResponse;
    }

    async function wallet(): Promise<AffiliateWalletResponse> {
      const send = await api();

      return (await (await send(`${BASE}/affiliate/me/wallet`))?.json()) as AffiliateWalletResponse;
    }

    function sum(values: number[]): number {
      return values.reduce((total, value) => total + value, 0);
    }

    const DAY = 24 * 60 * 60 * 1000;

    it('keeps only the sales of the thirty days before the last update', async () => {
      const all = await referrals(`?period=${ReferralPeriodEnum.ALL}`);
      const recent = await referrals(`?period=${ReferralPeriodEnum.LAST_30_DAYS}`);
      const since = new Date(all.updatedAt).getTime() - 30 * DAY;

      expect(recent.entries.length).toBeGreaterThan(0);
      expect(recent.entries.length).toBeLessThan(all.entries.length);
      expect(recent.entries).toEqual(
        all.entries.filter((entry) => new Date(entry.occurredAt).getTime() >= since),
      );
    });

    it('keeps the sales of the current year and drops the ones before it', async () => {
      const all = await referrals(`?period=${ReferralPeriodEnum.ALL}`);
      const year = await referrals(`?period=${ReferralPeriodEnum.YEAR}`);

      expect(year.entries.length).toBeLessThan(all.entries.length);
      expect(year.entries.every((entry) => entry.occurredAt.startsWith('2026'))).toBe(true);
      expect(all.entries.some((entry) => entry.occurredAt.startsWith('2025'))).toBe(true);
    });

    it('answers the thirty days when no period is asked', async () => {
      await expect(referrals()).resolves.toEqual(
        await referrals(`?period=${ReferralPeriodEnum.LAST_30_DAYS}`),
      );
    });

    it('refuses a period it does not know', async () => {
      const send = await api();
      const response = await send(`${BASE}/affiliate/me/referrals?period=SEMANA`);

      expect(response?.status).toBe(400);
    });

    it('lists the newest sale first', async () => {
      const { entries } = await referrals(`?period=${ReferralPeriodEnum.ALL}`);
      const times = entries.map((entry) => new Date(entry.occurredAt).getTime());

      expect(times).toEqual([...times].sort((a, b) => b - a));
    });

    /*
      O resumo é o acumulado da conta: trocar de aba na lista não pode mudar o
      número de vendas do topo da tela.
    */
    it('answers the same summary whatever the period', async () => {
      const recent = await referrals(`?period=${ReferralPeriodEnum.LAST_30_DAYS}`);
      const all = await referrals(`?period=${ReferralPeriodEnum.ALL}`);

      expect(recent.summary).toEqual(all.summary);
    });

    it('sums the summary from the sales, counting a pending one only as a coupon use', async () => {
      const { summary, entries } = await referrals(`?period=${ReferralPeriodEnum.ALL}`);
      const completed = entries.filter((entry) => entry.status === ReferralStatusEnum.COMPLETED);

      expect(completed.length).toBeLessThan(entries.length);
      expect(summary).toEqual({
        salesCents: sum(completed.map((entry) => entry.saleCents)),
        salesCount: completed.length,
        confirmedIncentiveCents: sum(completed.map((entry) => entry.incentiveCents)),
        couponUses: entries.length,
      });
    });

    /*
      A tela inicial e a carteira mostram o mesmo dinheiro por dois caminhos. Se
      o incentivo confirmado de uma não fechar com o que a outra creditou, a
      pessoa aprende que um dos dois números está errado.
    */
    it('closes with the wallet: every confirmed incentive is a credit in the statement', async () => {
      const { summary } = await referrals(`?period=${ReferralPeriodEnum.ALL}`);
      const { entries, balanceCents, paidCents } = await wallet();
      const credited = entries.filter((entry) => entry.kind === StatementEntryKindEnum.INCENTIVE);

      expect(sum(credited.map((entry) => entry.cents))).toBe(summary.confirmedIncentiveCents);
      expect(balanceCents + paidCents).toBe(summary.confirmedIncentiveCents);
    });
  });
});

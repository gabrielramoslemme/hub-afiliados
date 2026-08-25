/**
 * @jest-environment node
 */
import { AffiliateStatusEnum, AuthErrorCodeEnum, StatementEntryKindEnum } from '@porto/contracts';

const BASE = 'http://localhost:3000/v1';

/**
 * O dublê guarda estado em memória — aprovar tem que sumir da fila. Cada teste
 * recarrega o módulo para não herdar a decisão do anterior.
 */
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
    it('answers an unmapped account route instead of letting it escape', async () => {
      const send = await api();
      const response = await send(`${BASE}/affiliate/me/extrato`);

      expect(response?.status).toBe(404);
    });

    it('refuses the wrong password with the auth code the screen maps', async () => {
      const send = await api();
      const response = await send(`${BASE}/affiliate/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'cleide.nakamura@email.com', password: 'errada' }),
      });

      const body = await response?.json();

      expect(response?.status).toBe(401);
      expect(body.code).toBe(AuthErrorCodeEnum.INVALID_CREDENTIALS);
    });

    it('signs in an approved affiliate with a coupon', async () => {
      const send = await api();
      const response = await send(`${BASE}/affiliate/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'cleide.nakamura@email.com', password: 'MudarAgora!2026' }),
      });

      const body = await response?.json();

      expect(body.user).toMatchObject({
        status: AffiliateStatusEnum.APPROVED,
        coupon: 'CLEIDE25',
      });
    });

    it('never exposes the full cpf of the account', async () => {
      const send = await api();
      const account = await (await send(`${BASE}/affiliate/me`))?.json();

      expect(account.maskedCpf).toContain('*');
      expect(account).not.toHaveProperty('cpf');
    });

    /*
      A invariante que a referência quebra: o saldo do topo tem que ser a soma
      das linhas do extrato. Se alguém acrescentar uma entrada e esquecer de
      recalcular, é este teste que avisa.
    */
    it('balances the wallet against its own statement', async () => {
      const send = await api();
      const wallet = await (await send(`${BASE}/affiliate/me/wallet`))?.json();

      const sum = (kind: StatementEntryKindEnum) =>
        wallet.entries
          .filter((entry: { kind: StatementEntryKindEnum }) => entry.kind === kind)
          .reduce((total: number, entry: { cents: number }) => total + entry.cents, 0);

      expect(wallet.balanceCents).toBe(
        sum(StatementEntryKindEnum.INCENTIVE) - sum(StatementEntryKindEnum.PAYOUT),
      );
      expect(wallet.paidCents).toBe(sum(StatementEntryKindEnum.PAYOUT));
    });
  });
});

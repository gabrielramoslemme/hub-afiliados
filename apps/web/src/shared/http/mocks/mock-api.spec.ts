/**
 * @jest-environment node
 */
import { StatementEntryKindEnum } from '@porto/contracts';

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

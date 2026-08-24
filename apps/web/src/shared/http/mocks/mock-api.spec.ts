/**
 * @jest-environment node
 */
import { AffiliateStatusEnum, AuthErrorCodeEnum, StatementEntryKindEnum } from '@porto/contracts';

const BASE = 'http://localhost:3000/v1';
const PENDING = '10000000-0000-4000-8000-000000000001';
const APPROVED = '10000000-0000-4000-8000-000000000003';

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

  it('answers an unmapped admin route instead of letting it escape', async () => {
    const send = await api();
    const response = await send(`${BASE}/admin/reports`);

    expect(response?.status).toBe(404);
  });

  describe('login', () => {
    it('refuses the wrong password with the auth code the screen maps', async () => {
      const send = await api();
      const response = await send(`${BASE}/admin/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'analista@porto.example', password: 'errada' }),
      });

      expect(await response?.json()).toMatchObject({
        statusCode: 401,
        code: AuthErrorCodeEnum.INVALID_CREDENTIALS,
      });
    });

    it('accepts the seeded password and echoes the email back', async () => {
      const send = await api();
      const response = await send(`${BASE}/admin/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'outra@porto.example', password: 'MudarAgora!2026' }),
      });
      const body = await response?.json();

      expect(body.user.email).toBe('outra@porto.example');
    });
  });

  describe('queue', () => {
    it('pages the result', async () => {
      const send = await api();
      const body = await (await send(`${BASE}/admin/affiliates?page=1&limit=10`))?.json();

      expect(body.data).toHaveLength(10);
    });

    it('filters by status', async () => {
      const send = await api();
      const body = await (
        await send(`${BASE}/admin/affiliates?status=${AffiliateStatusEnum.REJECTED}`)
      )?.json();

      expect(
        body.data.every((item: { status: string }) => item.status === AffiliateStatusEnum.REJECTED),
      ).toBe(true);
    });

    it('finds by the digits of a cpf', async () => {
      const send = await api();
      const body = await (await send(`${BASE}/admin/affiliates?search=529.982.247-25`))?.json();

      expect(body.data[0].name).toBe('Marina Ferraz');
    });

    it('masks the cpf in the listing', async () => {
      const send = await api();
      const body = await (await send(`${BASE}/admin/affiliates`))?.json();

      expect(body.data[0].maskedCpf).toMatch(/^\*\*\*\.\*\*\*\./);
    });
  });

  describe('detail', () => {
    it('gives the full cpf, which the listing does not', async () => {
      const send = await api();
      const body = await (await send(`${BASE}/admin/affiliates/${PENDING}`))?.json();

      expect(body.cpf).toBe('52998224725');
    });

    it('answers 404 for an id nobody has', async () => {
      const send = await api();
      const response = await send(`${BASE}/admin/affiliates/nao-existe`);

      expect(response?.status).toBe(404);
    });
  });

  describe('decision', () => {
    it('approves a registration under review', async () => {
      const send = await api();
      const response = await send(`${BASE}/admin/affiliates/${PENDING}/approve`, {
        method: 'POST',
      });

      expect(response?.status).toBe(204);
    });

    it('takes the approved registration out of the review queue', async () => {
      const send = await api();
      await send(`${BASE}/admin/affiliates/${PENDING}/approve`, { method: 'POST' });

      const body = await (await send(`${BASE}/admin/affiliates/${PENDING}`))?.json();

      expect(body.status).toBe(AffiliateStatusEnum.APPROVED);
    });

    it('refuses to decide the same registration twice', async () => {
      const send = await api();
      await send(`${BASE}/admin/affiliates/${PENDING}/approve`, { method: 'POST' });

      const again = await send(`${BASE}/admin/affiliates/${PENDING}/approve`, { method: 'POST' });

      expect(again?.status).toBe(409);
    });

    it('refuses to decide a registration that was already decided', async () => {
      const send = await api();
      const response = await send(`${BASE}/admin/affiliates/${APPROVED}/approve`, {
        method: 'POST',
      });

      expect(response?.status).toBe(409);
    });

    it('records the rejection reason in the audit trail', async () => {
      const send = await api();
      const reason = 'Perfil fora do público-alvo do programa nesta etapa.';

      await send(`${BASE}/admin/affiliates/${PENDING}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      const history = await (await send(`${BASE}/admin/affiliates/${PENDING}/history`))?.json();

      expect(history.at(-1)).toMatchObject({
        toStatus: AffiliateStatusEnum.REJECTED,
        reason,
      });
    });
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

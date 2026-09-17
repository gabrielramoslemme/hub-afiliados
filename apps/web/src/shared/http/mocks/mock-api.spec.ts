/**
 * @jest-environment node
 */
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
});

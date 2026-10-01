import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('hashes with cost 10', async () => {
    const hash = await hasher.hash('MudarAgora!2026');

    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('accepts the password it hashed', async () => {
    const hash = await hasher.hash('MudarAgora!2026');

    await expect(hasher.compare('MudarAgora!2026', hash)).resolves.toBe(true);
  });

  it('refuses a different password', async () => {
    const hash = await hasher.hash('MudarAgora!2026');

    await expect(hasher.compare('outra-senha', hash)).resolves.toBe(false);
  });

  // Sem conta, ou com conta sem senha, o login gasta o mesmo bcrypt de quem
  // errou a senha: responder antes contaria, pelo tempo, quem tem cadastro.
  it('refuses a missing hash after spending a real comparison', async () => {
    const start = process.hrtime.bigint();
    await expect(hasher.compare('MudarAgora!2026', null)).resolves.toBe(false);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

    const hash = await hasher.hash('MudarAgora!2026');
    const reference = process.hrtime.bigint();
    await hasher.compare('outra-senha', hash);
    const referenceMs = Number(process.hrtime.bigint() - reference) / 1e6;

    expect(elapsedMs).toBeGreaterThan(referenceMs / 3);
  });
});

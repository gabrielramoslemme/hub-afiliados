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
});

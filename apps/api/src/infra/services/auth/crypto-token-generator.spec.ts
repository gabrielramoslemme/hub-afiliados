import { CryptoTokenGenerator } from './crypto-token-generator';

describe('CryptoTokenGenerator', () => {
  const generator = new CryptoTokenGenerator();

  // 32 bytes em hex: menos que isso e o link do e-mail vira adivinhável.
  it('issues a 32-byte token', () => {
    expect(generator.generate().token).toMatch(/^[0-9a-f]{64}$/);
  });

  // O hash gravado na emissão tem que ser o mesmo que a busca calcula a partir do link.
  it('stores the hash that the lookup computes from the token', () => {
    const { token, hash } = generator.generate();

    expect(generator.hash(token)).toBe(hash);
  });

  it('hashes with sha-256', () => {
    expect(generator.hash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

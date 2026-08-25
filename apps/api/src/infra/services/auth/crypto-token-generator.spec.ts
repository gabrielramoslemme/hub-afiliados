import { createHash } from 'node:crypto';
import { CryptoTokenGenerator } from './crypto-token-generator';

describe('CryptoTokenGenerator', () => {
  const generator = new CryptoTokenGenerator();

  it('hashes the token with sha-256', () => {
    const { token, hash } = generator.generate();

    expect(hash).toBe(createHash('sha256').update(token).digest('hex'));
  });

  it('never repeats a token', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generator.generate().token));

    expect(tokens.size).toBe(50);
  });
});

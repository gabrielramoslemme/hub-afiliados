import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { GeneratedToken, TokenGenerator } from '@Domain/auth/token-generator';

/** 32 bytes: o suficiente para o token não ser adivinhável por força bruta. */
const TOKEN_BYTES = 32;

@Injectable()
export class CryptoTokenGenerator implements TokenGenerator {
  generate(): GeneratedToken {
    const token = randomBytes(TOKEN_BYTES).toString('hex');

    return { token, hash: createHash('sha256').update(token).digest('hex') };
  }
}

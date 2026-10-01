import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '@Domain/auth/password-hasher';

const COST = 10;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  /** Um hash de mesmo custo, para quem não tem senha gastar a mesma comparação. */
  private decoy: Promise<string> | undefined;

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST);
  }

  async compare(plain: string, hash: string | null): Promise<boolean> {
    if (hash !== null) return bcrypt.compare(plain, hash);

    this.decoy ??= bcrypt.hash('sem-senha-cadastrada', COST);
    await bcrypt.compare(plain, await this.decoy);

    return false;
  }
}

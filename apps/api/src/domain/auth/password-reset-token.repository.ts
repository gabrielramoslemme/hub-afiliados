import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, type Repository } from 'typeorm';
import { TokenPurposeEnum } from '@porto/contracts';
import { PasswordResetTokenEntity } from '@Infra/database/typeorm/entities/password-reset-token.entity';

interface CreateTokenInput {
  userId: number;
  tokenHash: string;
  purpose: TokenPurposeEnum;
  expiresAt: Date;
}

@Injectable()
export class PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly repository: Repository<PasswordResetTokenEntity>,
  ) {}

  create(input: CreateTokenInput): Promise<PasswordResetTokenEntity> {
    return this.repository.save(this.repository.create(input));
  }

  findUsable(
    tokenHash: string,
    purpose: TokenPurposeEnum,
  ): Promise<PasswordResetTokenEntity | null> {
    return this.repository.findOne({
      where: { tokenHash, purpose, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
  }

  async markUsed(id: number): Promise<void> {
    await this.repository.update({ id }, { usedAt: new Date() });
  }

  /** Um pedido novo invalida os anteriores — dois links válidos ao mesmo tempo são superfície de ataque. */
  async invalidateAllFor(userId: number, purpose: TokenPurposeEnum): Promise<void> {
    await this.repository.update({ userId, purpose, usedAt: IsNull() }, { usedAt: new Date() });
  }

  async deleteExpired(): Promise<void> {
    await this.repository.delete({ expiresAt: LessThanOrEqual(new Date()) });
  }
}

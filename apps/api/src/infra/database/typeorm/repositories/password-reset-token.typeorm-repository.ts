import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { TokenPurposeEnum } from '@porto/contracts';
import {
  PasswordResetTokenEntity,
  PasswordResetTokenWithUser,
} from '@Domain/auth/password-reset-token.entity';
import {
  CreateTokenInput,
  PasswordResetTokenRepository,
} from '@Domain/auth/password-reset-token.repository';
import { PasswordResetTokenTypeormEntity } from '@Infra/database/typeorm/entities/password-reset-token.typeorm-entity';

@Injectable()
export class PasswordResetTokenTypeormRepository implements PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetTokenTypeormEntity)
    private readonly repository: Repository<PasswordResetTokenTypeormEntity>,
  ) {}

  create(input: CreateTokenInput): Promise<PasswordResetTokenEntity> {
    return this.repository.save(this.repository.create(input));
  }

  findUsable(
    tokenHash: string,
    purpose: TokenPurposeEnum,
  ): Promise<PasswordResetTokenWithUser | null> {
    return this.repository.findOne({
      where: { tokenHash, purpose, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
  }

  async markUsed(id: number): Promise<void> {
    await this.repository.update({ id }, { usedAt: new Date() });
  }

  async invalidateAllFor(userId: number, purpose: TokenPurposeEnum): Promise<void> {
    await this.repository.update({ userId, purpose, usedAt: IsNull() }, { usedAt: new Date() });
  }

  async deleteExpired(): Promise<void> {
    await this.repository.delete({ expiresAt: LessThanOrEqual(new Date()) });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, type Repository } from 'typeorm';
import { RefreshTokenEntity } from '@Infra/database/typeorm/entities/refresh-token.entity';

interface CreateRefreshTokenInput {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repository: Repository<RefreshTokenEntity>,
  ) {}

  create(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity> {
    return this.repository.save(this.repository.create(input));
  }

  findUsable(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: { tokenHash, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
  }

  async rotate(oldId: number, replacementId: number): Promise<void> {
    await this.repository.update(
      { id: oldId },
      { revokedAt: new Date(), replacedById: replacementId },
    );
  }

  async revoke(id: number): Promise<void> {
    await this.repository.update({ id }, { revokedAt: new Date() });
  }

  async revokeAllFor(userId: number): Promise<void> {
    await this.repository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}

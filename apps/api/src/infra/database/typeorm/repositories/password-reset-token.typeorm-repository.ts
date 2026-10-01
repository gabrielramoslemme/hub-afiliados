import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { TokenPurposeEnum } from '@porto/contracts';
import {
  PasswordResetTokenEntity,
  PasswordResetTokenWithUser,
} from '@Domain/auth/password-reset-token.entity';
import {
  CreateTokenInput,
  PasswordResetTokenRepository,
  RedeemTokenInput,
} from '@Domain/auth/password-reset-token.repository';
import { PasswordResetTokenTypeormEntity } from '@Infra/database/typeorm/entities/password-reset-token.typeorm-entity';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';

@Injectable()
export class PasswordResetTokenTypeormRepository implements PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetTokenTypeormEntity)
    private readonly repository: Repository<PasswordResetTokenTypeormEntity>,
    private readonly dataSource: DataSource,
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

  /*
    O `UPDATE` condicionado a `used_at IS NULL` é o que decide a corrida: dois
    pedidos com o mesmo link chegam aqui, e só um encontra a linha ainda livre.
    A senha entra na mesma transação, para o link nunca ficar gasto sem senha
    gravada — nem a senha gravada com o link ainda valendo.
  */
  redeem(input: RedeemTokenInput): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const claimed = await manager
        .createQueryBuilder()
        .update(PasswordResetTokenTypeormEntity)
        .set({ usedAt: () => 'now()' })
        .where('id = :id', { id: input.tokenId })
        .andWhere('used_at IS NULL')
        .andWhere('expires_at > now()')
        .execute();

      if (claimed.affected !== 1) return false;

      await manager.update(UserTypeormEntity, input.userId, {
        password: input.passwordHash,
        passwordSetAt: input.passwordSetAt,
        shouldChangePassword: false,
      });

      return true;
    });
  }

  async invalidateAllFor(userId: number, purpose: TokenPurposeEnum): Promise<void> {
    await this.repository.update({ userId, purpose, usedAt: IsNull() }, { usedAt: new Date() });
  }

  async listCreatedSince(userId: number, purpose: TokenPurposeEnum, since: Date): Promise<Date[]> {
    // Sem filtrar por `used_at`: quem conta o ritmo dos pedidos conta e-mail
    // que saiu, e o pedido seguinte invalida o token do anterior.
    const issued = await this.repository.find({
      where: { userId, purpose, createdAt: MoreThanOrEqual(since) },
      select: { createdAt: true },
    });

    return issued.map((token) => token.createdAt);
  }

  async deleteExpired(): Promise<void> {
    await this.repository.delete({ expiresAt: LessThanOrEqual(new Date()) });
  }
}

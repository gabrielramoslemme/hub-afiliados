import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AffiliateDetail,
  AffiliateEntity,
  AffiliateWithUser,
} from '@Domain/affiliates/affiliate.entity';
import {
  AffiliateRepository,
  ChangeAffiliateStatusInput,
} from '@Domain/affiliates/affiliate.repository';
import { AffiliateTypeormEntity } from '@Infra/database/typeorm/entities/affiliate.typeorm-entity';
import { AffiliateStatusHistoryTypeormEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.typeorm-entity';

@Injectable()
export class AffiliateTypeormRepository implements AffiliateRepository {
  constructor(
    @InjectRepository(AffiliateTypeormEntity)
    private readonly repository: Repository<AffiliateTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  findByCpf(cpf: string): Promise<AffiliateEntity | null> {
    return this.repository.findOne({ where: { cpf } });
  }

  findByPublicId(publicId: string): Promise<AffiliateDetail | null> {
    return this.repository.findOne({
      where: { publicId },
      relations: { user: true, termsVersion: true, approvedBy: true },
    });
  }

  findByUserId(userId: number): Promise<AffiliateWithUser | null> {
    return this.repository.findOne({ where: { userId }, relations: { user: true } });
  }

  save(affiliate: Partial<AffiliateEntity>): Promise<AffiliateEntity> {
    return this.repository.save(this.repository.create(affiliate));
  }

  changeStatus(input: ChangeAffiliateStatusInput): Promise<AffiliateEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      // O lock serializa duas decisões concorrentes sobre o mesmo afiliado:
      // sem ele, dois analistas gravariam transições partindo do mesmo status.
      const affiliate = await manager.findOne(AffiliateTypeormEntity, {
        where: { id: input.affiliateId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!affiliate) {
        return null;
      }

      const fromStatus = affiliate.status;
      Object.assign(affiliate, { status: input.toStatus }, input.changes ?? {});
      const updated = await manager.save(affiliate);

      await manager.insert(AffiliateStatusHistoryTypeormEntity, {
        affiliateId: affiliate.id,
        fromStatus,
        toStatus: input.toStatus,
        reason: input.reason ?? null,
        actorUserId: input.actorUserId ?? null,
      });

      return updated;
    });
  }
}

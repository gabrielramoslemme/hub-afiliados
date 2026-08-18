import { AffiliateStatusEnum } from '@porto/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AffiliateStatusHistoryEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.entity';

interface RecordInput {
  affiliateId: number;
  fromStatus: AffiliateStatusEnum | null;
  toStatus: AffiliateStatusEnum;
  reason?: string | null;
  actorUserId?: number | null;
}

@Injectable()
export class AffiliateStatusHistoryRepository {
  constructor(
    @InjectRepository(AffiliateStatusHistoryEntity)
    private readonly repository: Repository<AffiliateStatusHistoryEntity>,
  ) {}

  /**
   * Recebe o `manager` opcional para que o registro entre na mesma transação
   * da mudança de status. Trilha auditável que pode ficar de fora não é trilha.
   */
  async record(input: RecordInput, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(AffiliateStatusHistoryEntity) : this.repository;
    await repository.save(repository.create({ ...input, reason: input.reason ?? null, actorUserId: input.actorUserId ?? null }));
  }

  listByAffiliateId(affiliateId: number): Promise<AffiliateStatusHistoryEntity[]> {
    return this.repository.find({
      where: { affiliateId },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
    });
  }
}

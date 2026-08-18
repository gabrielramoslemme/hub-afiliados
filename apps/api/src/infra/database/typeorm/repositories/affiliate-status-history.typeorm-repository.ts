import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AffiliateStatusHistoryWithActor } from '@Domain/affiliates/affiliate-status-history.entity';
import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';
import { AffiliateStatusHistoryTypeormEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.typeorm-entity';

@Injectable()
export class AffiliateStatusHistoryTypeormRepository implements AffiliateStatusHistoryRepository {
  constructor(
    @InjectRepository(AffiliateStatusHistoryTypeormEntity)
    private readonly repository: Repository<AffiliateStatusHistoryTypeormEntity>,
  ) {}

  listByAffiliateId(affiliateId: number): Promise<AffiliateStatusHistoryWithActor[]> {
    return this.repository.find({
      where: { affiliateId },
      relations: { actor: true },
      // O `id` desempata registros gravados no mesmo instante.
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }
}

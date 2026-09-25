import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEntityEnum } from '@porto/contracts';
import { AuditLogWithActor } from '@Domain/audit/audit-log.entity';
import { AuditLogRepository } from '@Domain/audit/audit-log.repository';
import { AuditLogTypeormEntity } from '@Infra/database/typeorm/entities/audit-log.typeorm-entity';
import { CouponTypeormEntity } from '@Infra/database/typeorm/entities/coupon.typeorm-entity';

@Injectable()
export class AuditLogTypeormRepository implements AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogTypeormEntity)
    private readonly repository: Repository<AuditLogTypeormEntity>,
  ) {}

  /*
    O `id` desempata o mesmo instante: aprovar grava o status e emite o cupom na
    mesma transação, com o mesmo `now()`, e a ordem de gravação é a ordem em que
    a trilha conta — o cupom emitido aparece acima da aprovação que o emitiu.
  */
  listByAffiliateId(affiliateId: number): Promise<AuditLogWithActor[]> {
    return this.repository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where('log.entity = :affiliate AND log.entityId = :affiliateId', {
        affiliate: AuditEntityEnum.AFFILIATE,
        affiliateId,
      })
      .orWhere(
        `log.entity = :coupon AND log.entityId IN ${this.repository
          .createQueryBuilder()
          .subQuery()
          .select('coupon.id')
          .from(CouponTypeormEntity, 'coupon')
          .where('coupon.affiliateId = :affiliateId')
          .getQuery()}`,
        { coupon: AuditEntityEnum.COUPON },
      )
      .orderBy('log.createdAt', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .getMany();
  }
}

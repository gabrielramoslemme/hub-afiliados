import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditEntityEnum } from '@porto/contracts';
import { CouponEntity } from '@Domain/coupons/coupon.entity';
import { ChangeCouponRecordInput, CouponRepository } from '@Domain/coupons/coupon.repository';
import { CouponTypeormEntity } from '@Infra/database/typeorm/entities/coupon.typeorm-entity';
import { recordAuditLog } from './record-audit-log';

@Injectable()
export class CouponTypeormRepository implements CouponRepository {
  constructor(
    @InjectRepository(CouponTypeormEntity)
    private readonly repository: Repository<CouponTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  findByCode(code: string): Promise<CouponEntity | null> {
    return this.repository.findOne({ where: { code } });
  }

  change(input: ChangeCouponRecordInput): Promise<CouponEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      // O lock garante que o "antes" gravado na trilha é o que valia quando a
      // mudança entrou, e não o de uma leitura que outra alteração já envelheceu.
      const coupon = await manager.findOne(CouponTypeormEntity, {
        where: { id: input.couponId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!coupon) return null;

      const before = { status: coupon.status, discountPercent: coupon.discountPercent };

      // Ausente é "não mexe nesta coluna": copiar só o que veio impede que um
      // `undefined` vire `NULL` numa coluna que não aceita.
      if (input.discountPercent !== undefined) coupon.discountPercent = input.discountPercent;
      if (input.status !== undefined) coupon.status = input.status;

      const saved = await manager.save(coupon);

      await recordAuditLog(
        manager,
        { entity: AuditEntityEnum.COUPON, entityId: coupon.id, actorUserId: input.actorUserId },
        before,
        { status: saved.status, discountPercent: saved.discountPercent },
      );

      return saved;
    });
  }
}

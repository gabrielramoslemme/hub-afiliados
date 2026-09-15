import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponHistoryWithActor } from '@Domain/coupons/coupon-history.entity';
import { CouponHistoryRepository } from '@Domain/coupons/coupon-history.repository';
import { CouponHistoryTypeormEntity } from '@Infra/database/typeorm/entities/coupon-history.typeorm-entity';

@Injectable()
export class CouponHistoryTypeormRepository implements CouponHistoryRepository {
  constructor(
    @InjectRepository(CouponHistoryTypeormEntity)
    private readonly repository: Repository<CouponHistoryTypeormEntity>,
  ) {}

  listByCouponId(couponId: number): Promise<CouponHistoryWithActor[]> {
    return this.repository.find({
      where: { couponId },
      relations: { actor: true },
      // O `id` desempata registros gravados no mesmo instante.
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }
}

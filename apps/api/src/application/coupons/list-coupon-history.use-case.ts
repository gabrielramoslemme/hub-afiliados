import { CouponStatusEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { CouponHistoryRepository } from '@Domain/coupons/coupon-history.repository';
import { UseCase } from '../use-case';

export interface CouponHistoryOutput {
  fromStatus: CouponStatusEnum | null;
  toStatus: CouponStatusEnum;
  fromDiscountPercent: number | null;
  toDiscountPercent: number;
  actorName: string | null;
  createdAt: Date;
}

export class ListCouponHistoryUseCase implements UseCase<string, CouponHistoryOutput[]> {
  constructor(
    private readonly affiliateRepository: AffiliateRepository,
    private readonly couponHistoryRepository: CouponHistoryRepository,
  ) {}

  async execute(publicId: string): Promise<CouponHistoryOutput[]> {
    const affiliate = await this.affiliateRepository.findByPublicId(publicId);

    if (!affiliate) throw new AffiliateNotFoundError();

    // Sem cupom não há trilha de cupom: o cadastro ainda não passou pela aprovação.
    if (!affiliate.coupon) return [];

    const entries = await this.couponHistoryRepository.listByCouponId(affiliate.coupon.id);

    return entries.map((entry) => ({
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      fromDiscountPercent: entry.fromDiscountPercent,
      toDiscountPercent: entry.toDiscountPercent,
      actorName: entry.actor?.name ?? null,
      createdAt: entry.createdAt,
    }));
  }
}

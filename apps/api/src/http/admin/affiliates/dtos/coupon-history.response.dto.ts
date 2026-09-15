import { ApiProperty } from '@nestjs/swagger';
import { CouponHistoryItem, CouponStatusEnum } from '@porto/contracts';
import { CouponHistoryOutput } from '@Application/coupons/list-coupon-history.use-case';

export class CouponHistoryResponseDto implements CouponHistoryItem {
  @ApiProperty({ enum: CouponStatusEnum, nullable: true, description: 'Nulo na emissão' })
  fromStatus: CouponStatusEnum | null;

  @ApiProperty({ enum: CouponStatusEnum })
  toStatus: CouponStatusEnum;

  @ApiProperty({ type: Number, nullable: true, description: 'Nulo na emissão' })
  fromDiscountPercent: number | null;

  @ApiProperty({ minimum: 1, maximum: 25 })
  toDiscountPercent: number;

  @ApiProperty({ nullable: true })
  actorName: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(output: CouponHistoryOutput): CouponHistoryResponseDto {
    return { ...output, createdAt: output.createdAt.toISOString() };
  }
}

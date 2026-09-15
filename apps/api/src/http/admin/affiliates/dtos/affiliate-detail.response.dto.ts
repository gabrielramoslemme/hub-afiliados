import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateDetail,
  AffiliateStatusEnum,
  CouponStatusEnum,
  CouponSummary,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { AffiliateDetailOutput } from '@Application/affiliates/get-affiliate.use-case';

export class CouponSummaryResponseDto implements CouponSummary {
  @ApiProperty({ example: 'MARINA25' })
  code: string;

  @ApiProperty({ minimum: 1, maximum: 25, example: 10 })
  discountPercent: number;

  @ApiProperty({ enum: CouponStatusEnum })
  status: CouponStatusEnum;
}

export class AffiliateDetailResponseDto implements AffiliateDetail {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ example: '***.***.247-25' })
  maskedCpf: string;

  @ApiProperty({ example: '52998224725', description: 'Completo: só o detalhe o expõe' })
  cpf: string;

  @ApiProperty({ example: '12345678X', description: 'Completo: só o detalhe o expõe' })
  rg: string;

  @ApiProperty({ enum: SocialNetworkEnum, nullable: true })
  socialNetwork: SocialNetworkEnum | null;

  @ApiProperty({ nullable: true, example: 'marina.ferraz' })
  socialHandle: string | null;

  @ApiProperty({ enum: PixKeyTypeEnum })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty()
  pixKey: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty({ format: 'date-time', nullable: true })
  approvedAt: string | null;

  @ApiProperty({ nullable: true })
  approvedByName: string | null;

  @ApiProperty({ nullable: true })
  rejectionReason: string | null;

  @ApiProperty({
    type: CouponSummaryResponseDto,
    nullable: true,
    description: 'Emitido na aprovação; nulo em cadastro que ainda não passou por ela',
  })
  coupon: CouponSummaryResponseDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(output: AffiliateDetailOutput): AffiliateDetailResponseDto {
    return {
      ...output,
      approvedAt: output.approvedAt?.toISOString() ?? null,
      createdAt: output.createdAt.toISOString(),
    };
  }
}

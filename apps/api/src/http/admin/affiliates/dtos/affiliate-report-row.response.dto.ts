import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateReportRow,
  AffiliateStatusEnum,
  OccupationEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { AffiliateReportRowOutput } from '@Application/affiliates/list-affiliates-report.use-case';
import { CouponSummaryResponseDto } from './affiliate-detail.response.dto';

export class AffiliateReportRowResponseDto implements AffiliateReportRow {
  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ example: '52998224725', description: 'Completo, como no detalhe' })
  cpf: string;

  @ApiProperty({ example: '12345678X', description: 'Completo, como no detalhe' })
  rg: string;

  @ApiProperty({ enum: OccupationEnum })
  occupation: OccupationEnum;

  @ApiProperty({ enum: SocialNetworkEnum, nullable: true })
  socialNetwork: SocialNetworkEnum | null;

  @ApiProperty({ nullable: true })
  socialHandle: string | null;

  @ApiProperty({ enum: PixKeyTypeEnum })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty()
  pixKey: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  approvedAt: string | null;

  @ApiProperty({ type: CouponSummaryResponseDto, nullable: true })
  coupon: CouponSummaryResponseDto | null;

  @ApiProperty({ description: 'Vendas concluídas com o cupom' })
  completedSalesCount: number;

  @ApiProperty({ description: 'Centavos' })
  completedSalesCents: number;

  @ApiProperty({ description: 'Centavos. Incentivos das vendas concluídas' })
  releasedIncentiveCents: number;

  @ApiProperty({
    nullable: true,
    description: 'Centavos. Nulo até a Porto informar os pagamentos',
  })
  paidCommissionCents: number | null;

  static from(output: AffiliateReportRowOutput): AffiliateReportRowResponseDto {
    return {
      ...output,
      createdAt: output.createdAt.toISOString(),
      approvedAt: output.approvedAt?.toISOString() ?? null,
    };
  }
}

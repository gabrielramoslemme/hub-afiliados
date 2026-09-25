import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateReferral,
  AffiliateReferralsResponse,
  AffiliateReferralsSummary,
  ReferralStatusEnum,
} from '@porto/contracts';
import {
  AffiliateReferralOutput,
  AffiliateReferralsOutput,
} from '@Application/sales/get-affiliate-referrals.use-case';

export class AffiliateReferralDto implements AffiliateReferral {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ReferralStatusEnum })
  status: ReferralStatusEnum;

  @ApiProperty({ example: 'Conserto de fogão' })
  service: string;

  @ApiProperty({ description: 'Valor do serviço vendido, em centavos' })
  saleCents: number;

  @ApiProperty({ description: 'O incentivo do afiliado nesta venda, em centavos' })
  incentiveCents: number;

  @ApiProperty({ format: 'date-time', description: 'Quando o cliente comprou' })
  occurredAt: string;

  static from(output: AffiliateReferralOutput): AffiliateReferralDto {
    return {
      id: output.publicId,
      status: output.status,
      service: output.service,
      saleCents: output.saleCents,
      incentiveCents: output.incentiveCents,
      occurredAt: output.occurredAt.toISOString(),
    };
  }
}

export class AffiliateReferralsSummaryDto implements AffiliateReferralsSummary {
  @ApiProperty({ description: 'Soma do valor das vendas concluídas, em centavos' })
  salesCents: number;

  @ApiProperty({ description: 'Quantas vendas foram concluídas' })
  salesCount: number;

  @ApiProperty({ description: 'Soma dos incentivos das vendas concluídas, em centavos' })
  confirmedIncentiveCents: number;

  @ApiProperty({ description: 'Soma dos incentivos das vendas pendentes, em centavos' })
  pendingIncentiveCents: number;

  @ApiProperty({ description: 'Quantas vezes o cupom foi usado, com o serviço concluído ou não' })
  couponUses: number;
}

export class AffiliateReferralsResponseDto implements AffiliateReferralsResponse {
  @ApiProperty({ type: AffiliateReferralsSummaryDto, description: 'O acumulado, sem período' })
  summary: AffiliateReferralsSummaryDto;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;

  @ApiProperty({
    type: [AffiliateReferralDto],
    description: 'As vendas do período, mais recentes primeiro',
  })
  entries: AffiliateReferralDto[];

  static from(output: AffiliateReferralsOutput): AffiliateReferralsResponseDto {
    return {
      summary: output.summary,
      updatedAt: output.updatedAt.toISOString(),
      entries: output.entries.map((entry) => AffiliateReferralDto.from(entry)),
    };
  }
}

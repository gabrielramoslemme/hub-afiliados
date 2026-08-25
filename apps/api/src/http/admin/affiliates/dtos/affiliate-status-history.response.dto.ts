import { ApiProperty } from '@nestjs/swagger';
import { AffiliateStatusEnum, AffiliateStatusHistoryItem } from '@porto/contracts';
import { AffiliateStatusHistoryOutput } from '@Application/affiliates/list-affiliate-status-history.use-case';

export class AffiliateStatusHistoryResponseDto implements AffiliateStatusHistoryItem {
  @ApiProperty({ enum: AffiliateStatusEnum, nullable: true })
  fromStatus: AffiliateStatusEnum | null;

  @ApiProperty({ enum: AffiliateStatusEnum })
  toStatus: AffiliateStatusEnum;

  @ApiProperty({ nullable: true })
  reason: string | null;

  @ApiProperty({ nullable: true, description: 'Nulo quando a transição não teve operador' })
  actorName: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(output: AffiliateStatusHistoryOutput): AffiliateStatusHistoryResponseDto {
    return { ...output, createdAt: output.createdAt.toISOString() };
  }
}

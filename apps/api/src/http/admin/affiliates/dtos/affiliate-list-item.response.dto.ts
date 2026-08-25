import { ApiProperty } from '@nestjs/swagger';
import { AffiliateListItem, AffiliateStatusEnum, PaginatedResult } from '@porto/contracts';
import {
  AffiliateListItemOutput,
  ListAffiliatesOutput,
} from '@Application/affiliates/list-affiliates.use-case';

export class AffiliateListItemResponseDto implements AffiliateListItem {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ example: '***.***.247-25' })
  maskedCpf: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(output: AffiliateListItemOutput): AffiliateListItemResponseDto {
    // `Date` sai do use case como `Date`; serializar para o fio é daqui.
    return { ...output, createdAt: output.createdAt.toISOString() };
  }
}

export class PaginatedAffiliatesResponseDto implements PaginatedResult<AffiliateListItem> {
  @ApiProperty({ type: [AffiliateListItemResponseDto] })
  data: AffiliateListItemResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  static from(output: ListAffiliatesOutput): PaginatedAffiliatesResponseDto {
    return {
      data: output.data.map(AffiliateListItemResponseDto.from),
      total: output.total,
      page: output.page,
      limit: output.limit,
    };
  }
}

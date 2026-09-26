import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResult, WithdrawalListItem, WithdrawalStatusEnum } from '@porto/contracts';
import {
  ListWithdrawalsOutput,
  WithdrawalListItemOutput,
} from '@Application/withdrawals/list-withdrawals.use-case';

export class WithdrawalListItemResponseDto implements WithdrawalListItem {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty({ format: 'uuid' })
  affiliatePublicId: string;

  @ApiProperty()
  affiliateName: string;

  @ApiProperty({ example: '***.***.247-25' })
  maskedCpf: string;

  @ApiProperty()
  amountCents: number;

  @ApiProperty({ enum: WithdrawalStatusEnum })
  status: WithdrawalStatusEnum;

  @ApiProperty({ format: 'date-time' })
  requestedAt: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  paidAt: string | null;

  static from(output: WithdrawalListItemOutput): WithdrawalListItemResponseDto {
    return {
      ...output,
      requestedAt: output.requestedAt.toISOString(),
      paidAt: output.paidAt?.toISOString() ?? null,
    };
  }
}

export class PaginatedWithdrawalsResponseDto implements PaginatedResult<WithdrawalListItem> {
  @ApiProperty({ type: [WithdrawalListItemResponseDto] })
  data: WithdrawalListItemResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  static from(output: ListWithdrawalsOutput): PaginatedWithdrawalsResponseDto {
    return {
      data: output.data.map(WithdrawalListItemResponseDto.from),
      total: output.total,
      page: output.page,
      limit: output.limit,
    };
  }
}

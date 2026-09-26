import { ApiProperty } from '@nestjs/swagger';
import {
  PayoutEventOutcomeEnum,
  PayoutEventSourceEnum,
  PixKeyTypeEnum,
  WithdrawalDetail,
  WithdrawalEventItem,
  WithdrawalSaleItem,
} from '@porto/contracts';
import { WithdrawalDetailOutput } from '@Application/withdrawals/get-withdrawal.use-case';
import { WithdrawalListItemResponseDto } from './withdrawal-list-item.response.dto';

export class WithdrawalSaleItemDto implements WithdrawalSaleItem {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  item: string;

  @ApiProperty()
  incentiveCents: number;

  @ApiProperty({ format: 'date-time' })
  settledAt: string;
}

export class WithdrawalEventItemDto implements WithdrawalEventItem {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty({ enum: PayoutEventSourceEnum })
  source: PayoutEventSourceEnum;

  @ApiProperty({ nullable: true, example: 'FINALIZADO' })
  providerStatus: string | null;

  @ApiProperty({ enum: PayoutEventOutcomeEnum })
  outcome: PayoutEventOutcomeEnum;

  @ApiProperty({ format: 'date-time' })
  receivedAt: string;
}

export class WithdrawalDetailResponseDto
  extends WithdrawalListItemResponseDto
  implements WithdrawalDetail
{
  @ApiProperty({ enum: PixKeyTypeEnum })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty({ example: 'pi***@email.com' })
  maskedPixKey: string;

  @ApiProperty({ nullable: true })
  endToEndId: string | null;

  @ApiProperty({ nullable: true })
  receiptUrl: string | null;

  @ApiProperty({ nullable: true })
  failureReason: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  failedAt: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  returnedAt: string | null;

  @ApiProperty({ type: [WithdrawalSaleItemDto] })
  sales: WithdrawalSaleItemDto[];

  @ApiProperty({ type: [WithdrawalEventItemDto] })
  events: WithdrawalEventItemDto[];

  static fromDetail(output: WithdrawalDetailOutput): WithdrawalDetailResponseDto {
    return {
      ...WithdrawalListItemResponseDto.from(output),
      pixKeyType: output.pixKeyType,
      maskedPixKey: output.maskedPixKey,
      endToEndId: output.endToEndId,
      receiptUrl: output.receiptUrl,
      failureReason: output.failureReason,
      failedAt: output.failedAt?.toISOString() ?? null,
      returnedAt: output.returnedAt?.toISOString() ?? null,
      sales: output.sales.map((sale) => ({ ...sale, settledAt: sale.settledAt.toISOString() })),
      events: output.events.map((event) => ({
        ...event,
        receivedAt: event.receivedAt.toISOString(),
      })),
    };
  }
}

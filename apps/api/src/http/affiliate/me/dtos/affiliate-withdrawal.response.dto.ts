import { ApiProperty } from '@nestjs/swagger';
import { AffiliateWithdrawalResponse, WithdrawalStatusEnum } from '@porto/contracts';
import { RequestWithdrawalOutput } from '@Application/withdrawals/request-withdrawal.use-case';

export class AffiliateWithdrawalResponseDto implements AffiliateWithdrawalResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: WithdrawalStatusEnum,
    description: '`PROCESSING` quando o fornecedor aceitou; `REQUESTED` quando ainda não respondeu',
  })
  status: WithdrawalStatusEnum;

  @ApiProperty({ description: 'O saldo inteiro, em centavos' })
  amountCents: number;

  @ApiProperty({ format: 'date-time' })
  requestedAt: string;

  static from(output: RequestWithdrawalOutput): AffiliateWithdrawalResponseDto {
    return {
      id: output.publicId,
      status: output.status,
      amountCents: output.amountCents,
      requestedAt: output.requestedAt.toISOString(),
    };
  }
}

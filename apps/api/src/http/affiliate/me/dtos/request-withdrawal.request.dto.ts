import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { RequestWithdrawalRequest } from '@porto/contracts';

export class RequestWithdrawalRequestDto implements RequestWithdrawalRequest {
  @ApiPropertyOptional({
    description:
      'O saldo que a pessoa confirmou, em centavos. Diferente do saldo na hora do pedido: 409 WDR-004, sem reservar nada.',
    example: 4000,
  })
  @IsOptional()
  @IsInt({ message: 'O valor do saque é inválido.' })
  @Min(1, { message: 'O valor do saque é inválido.' })
  expectedCents?: number;
}

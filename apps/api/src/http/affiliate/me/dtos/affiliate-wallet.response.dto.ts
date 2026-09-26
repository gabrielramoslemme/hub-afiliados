import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateStatementEntry,
  AffiliateWalletResponse,
  StatementEntryKindEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import {
  AffiliateStatementEntryOutput,
  AffiliateWalletOutput,
} from '@Application/sales/get-affiliate-wallet.use-case';

export class AffiliateStatementEntryDto implements AffiliateStatementEntry {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: StatementEntryKindEnum })
  kind: StatementEntryKindEnum;

  @ApiProperty({ example: 'Conserto de fogão', description: 'O serviço que gerou o incentivo' })
  title: string;

  @ApiProperty({ description: 'Centavos, sempre positivo; o sinal vem do `kind`' })
  cents: number;

  @ApiProperty({
    format: 'date-time',
    description: 'Quando o incentivo foi liberado, ou o saque pago (pedido, enquanto não pago)',
  })
  occurredAt: string;

  @ApiProperty({
    enum: WithdrawalStatusEnum,
    nullable: true,
    description: 'Só nas linhas de saque',
  })
  withdrawalStatus: WithdrawalStatusEnum | null;

  @ApiProperty({ nullable: true, description: 'O comprovante do saque pago' })
  receiptUrl: string | null;

  static from(output: AffiliateStatementEntryOutput): AffiliateStatementEntryDto {
    return {
      id: output.publicId,
      kind: output.kind,
      title: output.title,
      cents: output.cents,
      occurredAt: output.occurredAt.toISOString(),
      withdrawalStatus: output.withdrawalStatus,
      receiptUrl: output.receiptUrl,
    };
  }
}

export class AffiliateWalletResponseDto implements AffiliateWalletResponse {
  @ApiProperty({ description: 'Incentivos liberados e livres, em centavos — o que o saque leva' })
  availableCents: number;

  @ApiProperty({ description: 'Soma dos saques pagos, em centavos' })
  withdrawnCents: number;

  @ApiProperty({ description: 'Soma dos saques que ainda não caíram, em centavos' })
  inFlightCents: number;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;

  @ApiProperty({ type: [AffiliateStatementEntryDto], description: 'Mais recentes primeiro' })
  entries: AffiliateStatementEntryDto[];

  static from(output: AffiliateWalletOutput): AffiliateWalletResponseDto {
    return {
      availableCents: output.availableCents,
      withdrawnCents: output.withdrawnCents,
      inFlightCents: output.inFlightCents,
      updatedAt: output.updatedAt.toISOString(),
      entries: output.entries.map((entry) => AffiliateStatementEntryDto.from(entry)),
    };
  }
}

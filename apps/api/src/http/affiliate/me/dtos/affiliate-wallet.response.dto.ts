import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateStatementEntry,
  AffiliateWalletResponse,
  StatementEntryKindEnum,
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

  @ApiProperty({ format: 'date-time', description: 'Quando o incentivo foi liberado' })
  occurredAt: string;

  static from(output: AffiliateStatementEntryOutput): AffiliateStatementEntryDto {
    return {
      id: output.publicId,
      kind: output.kind,
      title: output.title,
      cents: output.cents,
      occurredAt: output.occurredAt.toISOString(),
    };
  }
}

export class AffiliateWalletResponseDto implements AffiliateWalletResponse {
  @ApiProperty({ description: 'Soma dos incentivos liberados, em centavos' })
  releasedCents: number;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;

  @ApiProperty({ type: [AffiliateStatementEntryDto], description: 'Mais recentes primeiro' })
  entries: AffiliateStatementEntryDto[];

  static from(output: AffiliateWalletOutput): AffiliateWalletResponseDto {
    return {
      releasedCents: output.releasedCents,
      updatedAt: output.updatedAt.toISOString(),
      entries: output.entries.map((entry) => AffiliateStatementEntryDto.from(entry)),
    };
  }
}

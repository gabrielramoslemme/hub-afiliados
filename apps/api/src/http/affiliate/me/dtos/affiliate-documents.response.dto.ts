import { ApiProperty } from '@nestjs/swagger';
import { AffiliateDocumentsResponse } from '@porto/contracts';
import { AffiliateDocumentsOutput } from '@Application/affiliates/reveal-affiliate-documents.use-case';

export class AffiliateDocumentsResponseDto implements AffiliateDocumentsResponse {
  @ApiProperty({ example: '52998224725', description: 'Só dígitos' })
  cpf: string;

  @ApiProperty({ example: '12345678X' })
  rg: string;

  @ApiProperty({ example: 'marina.ferraz@email.com' })
  pixKey: string;

  static from(output: AffiliateDocumentsOutput): AffiliateDocumentsResponseDto {
    return { cpf: output.cpf, rg: output.rg, pixKey: output.pixKey };
  }
}

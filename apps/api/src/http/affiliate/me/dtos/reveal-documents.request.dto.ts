import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { RevealAffiliateDocumentsInput } from '@Application/affiliates/reveal-affiliate-documents.use-case';

/** Espelha o `revealDocumentsSchema` de `@porto/contracts`. */
export class RevealDocumentsRequestDto
  implements Omit<RevealAffiliateDocumentsInput, 'userPublicId'>
{
  @ApiProperty({ description: 'A senha atual, que confirma o pedido' })
  @IsString({ message: 'Informe sua senha atual.' })
  @IsNotEmpty({ message: 'Informe sua senha atual.' })
  currentPassword: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Espelha o `rejectAffiliateSchema` de `@porto/contracts`: o schema é a
 * autoridade do formulário, este DTO é a autoridade da API. Duas expressões da
 * mesma regra, uma em cada ponta.
 */
export class RejectAffiliateRequestDto {
  @ApiProperty({ minLength: 10, maxLength: 500 })
  @IsString({ message: 'Descreva o motivo com ao menos 10 caracteres' })
  @MinLength(10, { message: 'Descreva o motivo com ao menos 10 caracteres' })
  @MaxLength(500, { message: 'O motivo deve ter no máximo 500 caracteres' })
  reason: string;
}

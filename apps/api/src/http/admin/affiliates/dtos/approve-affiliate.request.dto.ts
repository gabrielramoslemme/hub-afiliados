import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Espelha o `approveAffiliateSchema` de `@porto/contracts`: o schema é a
 * autoridade do formulário, este DTO é a autoridade da API. Duas expressões da
 * mesma regra, uma em cada ponta.
 *
 * Os limites do percentual são os do INT-01; os do código são de produto — a
 * Porto aceita 200 caracteres, mas quem digita o cupom é um cliente final no
 * checkout.
 */
export class ApproveAffiliateRequestDto {
  @ApiProperty({ minLength: 4, maxLength: 20, example: 'MARINA25' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'Informe o código do cupom' })
  @MinLength(4, { message: 'O código deve ter ao menos 4 caracteres' })
  @MaxLength(20, { message: 'O código deve ter no máximo 20 caracteres' })
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Use apenas letras e números, sem espaço nem acento',
  })
  couponCode: string;

  @ApiProperty({ minimum: 1, maximum: 25, example: 10 })
  @IsInt({ message: 'O percentual deve ser um número inteiro' })
  @Min(1, { message: 'O desconto começa em 1%' })
  @Max(25, { message: 'O desconto vai até 25%' })
  couponDiscountPercent: number;
}

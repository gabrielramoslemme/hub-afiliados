import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CouponStatusEnum } from '@porto/contracts';

/**
 * Espelha o `changeCouponSchema` de `@porto/contracts`: o schema é a autoridade
 * do formulário, este DTO é a autoridade da API.
 *
 * Os dois campos são opcionais porque o INT-01 aceita alterar um sem o outro. O
 * corpo vazio é recusado pelo use case, e não aqui: "mudar sem nada para mudar"
 * é regra, e o `ValidationPipe` só sabe olhar campo a campo.
 */
export class ChangeCouponRequestDto {
  @ApiPropertyOptional({ enum: CouponStatusEnum })
  @IsOptional()
  @IsEnum(CouponStatusEnum, { message: 'Informe um status de cupom válido' })
  status?: CouponStatusEnum;

  @ApiPropertyOptional({ minimum: 1, maximum: 25, example: 15 })
  @IsOptional()
  @IsInt({ message: 'O percentual deve ser um número inteiro' })
  @Min(1, { message: 'O desconto começa em 1%' })
  @Max(25, { message: 'O desconto vai até 25%' })
  discountPercent?: number;
}

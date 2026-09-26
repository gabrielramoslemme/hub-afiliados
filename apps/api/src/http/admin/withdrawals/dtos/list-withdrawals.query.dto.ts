import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WithdrawalStatusEnum } from '@porto/contracts';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MESSAGE = { message: 'Use a data no formato AAAA-MM-DD.' };

export class ListWithdrawalsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt({ message: 'A página precisa ser um número inteiro.' })
  @Min(1, { message: 'A página começa em 1.' })
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @Type(() => Number)
  @IsInt({ message: 'O tamanho da página precisa ser um número inteiro.' })
  @Min(1, { message: 'O tamanho da página começa em 1.' })
  @Max(100, { message: 'O tamanho da página vai até 100.' })
  @IsOptional()
  limit = 10;

  @ApiPropertyOptional({ enum: WithdrawalStatusEnum })
  @IsEnum(WithdrawalStatusEnum, { message: 'Status inválido.' })
  @IsOptional()
  status?: WithdrawalStatusEnum;

  @ApiPropertyOptional({ maxLength: 120, description: 'Nome do afiliado ou CPF' })
  @IsString()
  @MaxLength(120, { message: 'A busca deve ter no máximo 120 caracteres.' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Pedidos a partir deste dia (Brasília)',
  })
  @Matches(DAY, DAY_MESSAGE)
  // O regex acima só confere o formato; `strict` recusa dia que não existe
  // no calendário (ex.: 2026-02-30), que o `Date` do JS aceitaria rolando
  // para o mês seguinte em silêncio.
  @IsDateString({ strict: true }, DAY_MESSAGE)
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Pedidos até este dia, inclusive (Brasília)',
  })
  @Matches(DAY, DAY_MESSAGE)
  @IsDateString({ strict: true }, DAY_MESSAGE)
  @IsOptional()
  until?: string;
}

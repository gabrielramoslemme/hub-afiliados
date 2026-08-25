import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AffiliateStatusEnum } from '@porto/contracts';
import { AffiliateSortBy, AffiliateSortOrder } from '@Domain/affiliates/affiliate.repository';

const SORTABLE: AffiliateSortBy[] = ['createdAt', 'name'];
const ORDERS: AffiliateSortOrder[] = ['asc', 'desc'];

export class ListAffiliatesQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt({ message: 'A página precisa ser um número inteiro.' })
  @Min(1, { message: 'A página começa em 1.' })
  @IsOptional()
  page = 1;

  // O teto existe para uma página não virar exportação da base inteira.
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @Type(() => Number)
  @IsInt({ message: 'O tamanho da página precisa ser um número inteiro.' })
  @Min(1, { message: 'O tamanho da página começa em 1.' })
  @Max(100, { message: 'O tamanho da página vai até 100.' })
  @IsOptional()
  limit = 10;

  @ApiPropertyOptional({ enum: AffiliateStatusEnum })
  @IsEnum(AffiliateStatusEnum, { message: 'Status inválido.' })
  @IsOptional()
  status?: AffiliateStatusEnum;

  @ApiPropertyOptional({ maxLength: 120, description: 'Nome, e-mail ou CPF' })
  @IsString()
  @MaxLength(120, { message: 'A busca deve ter no máximo 120 caracteres.' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: SORTABLE, default: 'createdAt' })
  @IsIn(SORTABLE, { message: 'Ordenação inválida.' })
  @IsOptional()
  sortBy: AffiliateSortBy = 'createdAt';

  @ApiPropertyOptional({ enum: ORDERS, default: 'desc' })
  @IsIn(ORDERS, { message: 'Direção de ordenação inválida.' })
  @IsOptional()
  sortOrder: AffiliateSortOrder = 'desc';
}

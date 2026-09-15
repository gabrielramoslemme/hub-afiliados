import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CouponAvailabilityQueryDto {
  @ApiProperty({ minLength: 4, maxLength: 20, example: 'MARINA25' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'Informe o código do cupom' })
  @MinLength(4, { message: 'O código deve ter ao menos 4 caracteres' })
  @MaxLength(20, { message: 'O código deve ter no máximo 20 caracteres' })
  code: string;
}

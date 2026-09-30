import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, IsUrl, Length, Max, MaxLength, Min } from 'class-validator';
import { MaterialFileFormatEnum, PromotionalMaterialRequest } from '@porto/contracts';
import { HTTPS_URL, trim } from './material-fields';

/** Espelha o `promotionalMaterialSchema`. Serve ao POST e ao PUT, que troca o material inteiro. */
export class PromotionalMaterialRequestDto implements PromotionalMaterialRequest {
  @ApiProperty({ minLength: 3, maxLength: 120, example: 'Mídia Kit' })
  @trim()
  @IsString({ message: 'Informe o título' })
  @Length(3, 120, { message: 'O título precisa ter de 3 a 120 caracteres' })
  title: string;

  @ApiProperty({ minLength: 3, maxLength: 500 })
  @trim()
  @IsString({ message: 'Informe a descrição' })
  @Length(3, 500, { message: 'A descrição precisa ter de 3 a 500 caracteres' })
  description: string;

  @ApiProperty({ maxLength: 2048 })
  @trim()
  @IsString({ message: 'Informe a URL do arquivo' })
  @MaxLength(2048, { message: 'A URL pode ter até 2048 caracteres' })
  @IsUrl(HTTPS_URL, { message: 'Informe uma URL que comece com https://' })
  fileUrl: string;

  @ApiProperty({ enum: MaterialFileFormatEnum })
  @IsEnum(MaterialFileFormatEnum, { message: 'Escolha o formato do arquivo' })
  fileFormat: MaterialFileFormatEnum;

  @ApiProperty({ minimum: 1, maximum: 2_000_000_000, example: 2_400_000 })
  @IsInt({ message: 'O tamanho deve ser um número inteiro de bytes' })
  @Min(1, { message: 'Informe o tamanho do arquivo' })
  @Max(2_000_000_000, { message: 'O arquivo pode ter até 2000 MB' })
  fileSizeBytes: number;

  @ApiProperty({ minimum: 1, maximum: 999, description: 'A ordem na lista' })
  @IsInt({ message: 'A posição deve ser um número inteiro' })
  @Min(1, { message: 'A posição começa em 1' })
  @Max(999, { message: 'A posição vai até 999' })
  position: number;
}

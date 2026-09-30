import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUrl, Length, Max, MaxLength, Min } from 'class-validator';
import { TrainingModuleRequest } from '@porto/contracts';
import { HTTPS_URL, trim } from './material-fields';

/** Espelha o `trainingModuleSchema`. Serve ao POST e ao PUT, que troca o módulo inteiro. */
export class TrainingModuleRequestDto implements TrainingModuleRequest {
  @ApiProperty({ minLength: 3, maxLength: 120, example: 'Módulo 1 - Porto Serviço' })
  @trim()
  @IsString({ message: 'Informe o título' })
  @Length(3, 120, { message: 'O título precisa ter de 3 a 120 caracteres' })
  title: string;

  @ApiProperty({ minLength: 3, maxLength: 500 })
  @trim()
  @IsString({ message: 'Informe a descrição' })
  @Length(3, 500, { message: 'A descrição precisa ter de 3 a 500 caracteres' })
  description: string;

  @ApiProperty({ maxLength: 2048, example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @trim()
  @IsString({ message: 'Informe a URL do vídeo' })
  @MaxLength(2048, { message: 'A URL pode ter até 2048 caracteres' })
  @IsUrl(HTTPS_URL, { message: 'Informe uma URL que comece com https://' })
  videoUrl: string;

  @ApiProperty({ minimum: 1, maximum: 600, example: 5 })
  @IsInt({ message: 'A duração deve ser um número inteiro de minutos' })
  @Min(1, { message: 'A duração começa em 1 minuto' })
  @Max(600, { message: 'A duração vai até 600 minutos' })
  durationMinutes: number;

  @ApiProperty({ minimum: 1, maximum: 999, description: 'A ordem na trilha' })
  @IsInt({ message: 'A posição deve ser um número inteiro' })
  @Min(1, { message: 'A posição começa em 1' })
  @Max(999, { message: 'A posição vai até 999' })
  position: number;
}

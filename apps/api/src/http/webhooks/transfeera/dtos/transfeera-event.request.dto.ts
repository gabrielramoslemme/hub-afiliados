import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsOptional, IsString, ValidateNested } from 'class-validator';

/*
  Só o que se lê é validado. O resto do corpo — conta de destino, banco, datas
  — é descartado aqui e guardado limpo na trilha pelo `@Body()` cru.
*/
export class TransfeeraTransferDto {
  // A Transfeera documenta o id como string e manda número em alguns exemplos.
  @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'number' }] })
  @Allow()
  id?: string | number | null;

  @ApiProperty({ description: 'O `publicId` do saque' })
  @IsString()
  integration_id: string;

  @ApiProperty({ example: 'FINALIZADO' })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status_description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receipt_url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_receipt_url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pix_end2end_id?: string | null;

  @Allow()
  error?: unknown;
}

export class TransfeeraEventRequestDto {
  // Número aqui não pode invalidar o corpo: o evento seria gravado como sem
  // efeito, responderia 200 e a Transfeera não mandaria de novo.
  @ApiPropertyOptional({
    description: 'O id do evento na Transfeera',
    oneOf: [{ type: 'string' }, { type: 'number' }],
  })
  @Allow()
  id?: string | number | null;

  @ApiProperty({ example: 'Transfer' })
  @IsString()
  object: string;

  @ApiPropertyOptional({ type: TransfeeraTransferDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransfeeraTransferDto)
  data?: TransfeeraTransferDto;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IncentiveStatusEnum } from '@porto/contracts';
import { ApplyIncentiveEventInput } from '@Application/sales/apply-incentive-event.use-case';
import { IncentiveEventTypeEnum } from '@Domain/sales/incentive-event.entity';

/*
  O contrato é da Porto Serviços, e os nomes dos campos também: os nomes em
  português ficam neste arquivo e em nenhum outro. `toInput` é a fronteira — dali
  para dentro, só o vocabulário do domínio.

  A mensagem de campo aninhado não repete o pai: o class-validator já a prefixa
  com ele, e `cupom é obrigatório` chega como `venda.cupom é obrigatório`.
*/

const EVENT_TYPE_BY_WIRE = {
  VENDA_REGISTRADA: IncentiveEventTypeEnum.SALE_REGISTERED,
  VENDA_CONCLUIDA: IncentiveEventTypeEnum.SALE_COMPLETED,
  VENDA_NAO_CONCLUIDA: IncentiveEventTypeEnum.SALE_NOT_COMPLETED,
} as const;

const INCENTIVE_STATUS_BY_WIRE = {
  PENDENTE: IncentiveStatusEnum.PENDING,
  LIBERADO: IncentiveStatusEnum.RELEASED,
  CANCELADO: IncentiveStatusEnum.CANCELED,
} as const;

type WireEventType = keyof typeof EVENT_TYPE_BY_WIRE;
type WireIncentiveStatus = keyof typeof INCENTIVE_STATUS_BY_WIRE;

export class IncentiveEventDto {
  @ApiProperty({ enum: Object.keys(EVENT_TYPE_BY_WIRE), example: 'VENDA_REGISTRADA' })
  @IsIn(Object.keys(EVENT_TYPE_BY_WIRE), {
    message: 'tipoEvento deve ser VENDA_REGISTRADA, VENDA_CONCLUIDA ou VENDA_NAO_CONCLUIDA',
  })
  tipoEvento: WireEventType;

  @ApiPropertyOptional({ example: 'Venda realizada com seu cupom' })
  @IsOptional()
  @IsString({ message: 'descricaoEvento deve ser texto' })
  descricaoEvento?: string;
}

export class IncentiveDto {
  @ApiProperty({ enum: Object.keys(INCENTIVE_STATUS_BY_WIRE), example: 'PENDENTE' })
  @IsIn(Object.keys(INCENTIVE_STATUS_BY_WIRE), {
    message: 'status deve ser PENDENTE, LIBERADO ou CANCELADO',
  })
  status: WireIncentiveStatus;
}

export class IncentiveSaleDto {
  @ApiProperty({ example: '7c4f7b20-709a-4bde-8646-2fd1a5ae6fd4' })
  @IsString({ message: 'id é obrigatório' })
  @IsNotEmpty({ message: 'id é obrigatório' })
  @MaxLength(100, { message: 'id aceita até 100 caracteres' })
  id: string;

  @ApiProperty({ example: 'PARCEIRO10' })
  @IsString({ message: 'cupom é obrigatório' })
  @IsNotEmpty({ message: 'cupom é obrigatório' })
  @MaxLength(200, { message: 'cupom aceita até 200 caracteres' })
  cupom: string;

  @ApiProperty({ example: 310.99, description: 'Em reais, com até duas casas decimais' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'valorVenda deve ter até duas casas decimais' })
  @Min(0, { message: 'valorVenda não pode ser negativo' })
  valorVenda: number;

  @ApiProperty({ example: 'PFAZ * VENTILADOR' })
  @IsString({ message: 'item é obrigatório' })
  @IsNotEmpty({ message: 'item é obrigatório' })
  item: string;
}

export class IncentiveNotificationRequestDto {
  @ApiProperty({ example: '8d4a9d5f-4f17-4ad8-bec7-16db8d0e2a4b' })
  @IsString({ message: 'idEvento é obrigatório' })
  @IsNotEmpty({ message: 'idEvento é obrigatório' })
  @MaxLength(100, { message: 'idEvento aceita até 100 caracteres' })
  idEvento: string;

  @ApiProperty({ format: 'date-time', example: '2026-09-11T12:17:08.319Z' })
  @IsISO8601({ strict: true }, { message: 'dataHoraEvento deve ser data e hora ISO-8601' })
  dataHoraEvento: string;

  @ApiProperty({ type: IncentiveEventDto })
  @ValidateNested()
  @Type(() => IncentiveEventDto)
  @IsNotEmpty({ message: 'evento é obrigatório' })
  evento: IncentiveEventDto;

  @ApiProperty({ type: IncentiveDto })
  @ValidateNested()
  @Type(() => IncentiveDto)
  @IsNotEmpty({ message: 'incentivo é obrigatório' })
  incentivo: IncentiveDto;

  @ApiProperty({ type: IncentiveSaleDto })
  @ValidateNested()
  @Type(() => IncentiveSaleDto)
  @IsNotEmpty({ message: 'venda é obrigatória' })
  venda: IncentiveSaleDto;

  /** O corpo inteiro vai para a trilha como chegou, com o que o DTO descartou. */
  static toInput(
    dto: IncentiveNotificationRequestDto,
    payload: Record<string, unknown>,
  ): ApplyIncentiveEventInput {
    return {
      eventId: dto.idEvento,
      sentAt: new Date(dto.dataHoraEvento),
      eventType: EVENT_TYPE_BY_WIRE[dto.evento.tipoEvento],
      incentiveStatus: INCENTIVE_STATUS_BY_WIRE[dto.incentivo.status],
      externalSaleId: dto.venda.id,
      couponCode: dto.venda.cupom,
      // Arredondar, não truncar: 310.99 * 100 é 31098.999999999996 em float.
      amountCents: Math.round(dto.venda.valorVenda * 100),
      item: dto.venda.item,
      payload,
    };
  }
}

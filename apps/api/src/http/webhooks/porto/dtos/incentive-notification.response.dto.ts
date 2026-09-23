import { ApiProperty } from '@nestjs/swagger';
import { ApplyIncentiveEventOutput } from '@Application/sales/apply-incentive-event.use-case';

export enum IncentiveNotificationStatusEnum {
  PROCESSED = 'PROCESSED',
  /** A mesma ação já tinha sido aplicada. Também é 2xx: a Porto não deve reenviar. */
  ALREADY_APPLIED = 'ALREADY_APPLIED',
}

export class IncentiveNotificationResponseDto {
  @ApiProperty({ enum: IncentiveNotificationStatusEnum })
  status: IncentiveNotificationStatusEnum;

  @ApiProperty({ format: 'uuid', description: 'Identificador da venda na Mesa' })
  saleId: string;

  static from(output: ApplyIncentiveEventOutput): IncentiveNotificationResponseDto {
    return {
      status: output.applied
        ? IncentiveNotificationStatusEnum.PROCESSED
        : IncentiveNotificationStatusEnum.ALREADY_APPLIED,
      saleId: output.salePublicId,
    };
  }
}

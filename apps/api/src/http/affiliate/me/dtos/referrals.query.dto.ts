import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReferralPeriodEnum } from '@porto/contracts';

export class ReferralsQueryDto {
  @ApiPropertyOptional({ enum: ReferralPeriodEnum, default: ReferralPeriodEnum.LAST_30_DAYS })
  @IsEnum(ReferralPeriodEnum, { message: 'Período inválido.' })
  @IsOptional()
  period: ReferralPeriodEnum = ReferralPeriodEnum.LAST_30_DAYS;
}

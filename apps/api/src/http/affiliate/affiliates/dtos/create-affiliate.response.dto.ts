import { ApiProperty } from '@nestjs/swagger';
import { AffiliateStatusEnum } from '@porto/contracts';

export class CreateAffiliateResponseDto {
  @ApiProperty({ format: 'uuid', example: '10000000-0000-4000-8000-000000000001' })
  publicId: string;

  @ApiProperty({ enum: AffiliateStatusEnum, example: AffiliateStatusEnum.PENDING_APPROVAL })
  status: AffiliateStatusEnum;
}

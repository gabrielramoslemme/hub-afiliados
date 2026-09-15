import { ApiProperty } from '@nestjs/swagger';
import { CouponAvailabilityResponse } from '@porto/contracts';

export class CouponAvailabilityResponseDto implements CouponAvailabilityResponse {
  @ApiProperty({ example: 'MARINA25', description: 'O código normalizado, em maiúsculas' })
  code: string;

  @ApiProperty()
  available: boolean;

  @ApiProperty({ nullable: true, description: 'Preenchido só quando o código está ocupado' })
  reason: string | null;

  static from(output: CouponAvailabilityResponse): CouponAvailabilityResponseDto {
    return { code: output.code, available: output.available, reason: output.reason };
  }
}

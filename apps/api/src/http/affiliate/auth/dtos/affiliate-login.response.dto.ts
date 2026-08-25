import { ApiProperty } from '@nestjs/swagger';
import { AffiliateLoginResponse, AffiliateStatusEnum } from '@porto/contracts';

class AffiliateLoginUserDto {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty({ nullable: true, description: 'Nulo enquanto a Porto não emitir o cupom' })
  coupon: string | null;
}

export class AffiliateLoginResponseDto implements AffiliateLoginResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: AffiliateLoginUserDto })
  user: AffiliateLoginUserDto;
}

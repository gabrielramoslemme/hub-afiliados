import { ApiProperty } from '@nestjs/swagger';
import { AdminLoginResponse, UserRoleEnum } from '@porto/contracts';

class AdminLoginUserDto {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRoleEnum })
  role: UserRoleEnum;

  @ApiProperty()
  shouldChangePassword: boolean;
}

/**
 * A classe existe porque o Swagger precisa do metadado em runtime; o
 * `implements` é o compilador cobrando que ela continue igual ao contrato que
 * o painel consome.
 */
export class AdminLoginResponseDto implements AdminLoginResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: AdminLoginUserDto })
  user: AdminLoginUserDto;
}

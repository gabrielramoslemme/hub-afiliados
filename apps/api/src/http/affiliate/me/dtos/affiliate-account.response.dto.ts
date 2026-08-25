import { ApiProperty } from '@nestjs/swagger';
import { AffiliateMeResponse, AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateAccountOutput } from '@Application/affiliates/get-affiliate-account.use-case';

export class AffiliateAccountResponseDto implements AffiliateMeResponse {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ example: '***.***.247-25' })
  maskedCpf: string;

  @ApiProperty({ enum: PixKeyTypeEnum })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty({ example: 'ma***********@email.com' })
  maskedPixKey: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty({ nullable: true, description: 'Nulo enquanto a Porto não emitir o cupom' })
  coupon: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(output: AffiliateAccountOutput): AffiliateAccountResponseDto {
    return { ...output, createdAt: output.createdAt.toISOString() };
  }
}

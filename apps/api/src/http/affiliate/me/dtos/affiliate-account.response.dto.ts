import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateMeResponse,
  AffiliateStatusEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
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

  @ApiProperty({ example: '*****678X' })
  maskedRg: string;

  @ApiProperty({ enum: SocialNetworkEnum, nullable: true })
  socialNetwork: SocialNetworkEnum | null;

  @ApiProperty({ nullable: true, example: 'marina.ferraz' })
  socialHandle: string | null;

  @ApiProperty({ enum: PixKeyTypeEnum })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty({ example: 'ma***********@email.com' })
  maskedPixKey: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty({ nullable: true, description: 'Nulo enquanto a Porto não emitir o cupom' })
  coupon: string | null;

  @ApiProperty({
    nullable: true,
    example: 10,
    description: 'Desconto do cupom para quem compra, em %; nulo junto com o cupom',
  })
  couponDiscountPercent: number | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(output: AffiliateAccountOutput): AffiliateAccountResponseDto {
    return { ...output, createdAt: output.createdAt.toISOString() };
  }
}

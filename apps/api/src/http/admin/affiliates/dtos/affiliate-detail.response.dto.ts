import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateDetail,
  AffiliateStatusEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { AffiliateDetailOutput } from '@Application/affiliates/get-affiliate.use-case';

export class AffiliateDetailResponseDto implements AffiliateDetail {
  @ApiProperty({ format: 'uuid' })
  publicId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ example: '***.***.247-25' })
  maskedCpf: string;

  @ApiProperty({ example: '52998224725', description: 'Completo: só o detalhe o expõe' })
  cpf: string;

  @ApiProperty({ example: '12345678X', description: 'Completo: só o detalhe o expõe' })
  rg: string;

  @ApiProperty({ enum: SocialNetworkEnum, nullable: true })
  socialNetwork: SocialNetworkEnum | null;

  @ApiProperty({ nullable: true, example: 'marina.ferraz' })
  socialHandle: string | null;

  @ApiProperty({ enum: PixKeyTypeEnum })
  pixKeyType: PixKeyTypeEnum;

  @ApiProperty()
  pixKey: string;

  @ApiProperty({ enum: AffiliateStatusEnum })
  status: AffiliateStatusEnum;

  @ApiProperty({ format: 'date-time', nullable: true })
  approvedAt: string | null;

  @ApiProperty({ nullable: true })
  approvedByName: string | null;

  @ApiProperty({ nullable: true })
  rejectionReason: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(output: AffiliateDetailOutput): AffiliateDetailResponseDto {
    return {
      ...output,
      approvedAt: output.approvedAt?.toISOString() ?? null,
      createdAt: output.createdAt.toISOString(),
    };
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { AffiliateDetail, AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
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

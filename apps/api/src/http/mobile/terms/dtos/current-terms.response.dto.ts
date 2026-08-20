import { ApiProperty } from '@nestjs/swagger';

export class CurrentTermsResponseDto {
  @ApiProperty({ example: '1.0-homolog' })
  version: string;

  @ApiProperty({ example: 'https://example.com/termos/1.0' })
  contentUrl: string;

  @ApiProperty({ example: '2026-08-17T12:00:00.000Z' })
  publishedAt: string;
}

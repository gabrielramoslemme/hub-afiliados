import { ApiProperty } from '@nestjs/swagger';
import { AdminPromotionalMaterial, MaterialFileFormatEnum } from '@porto/contracts';
import { PromotionalMaterialOutput } from '@Application/materials/material.output';

export class PromotionalMaterialResponseDto implements AdminPromotionalMaterial {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ format: 'uri' })
  fileUrl: string;

  @ApiProperty({ enum: MaterialFileFormatEnum })
  fileFormat: MaterialFileFormatEnum;

  @ApiProperty({ description: 'Em bytes, como o operador informou' })
  fileSizeBytes: number;

  @ApiProperty({ description: 'A ordem na lista' })
  position: number;

  static from(output: PromotionalMaterialOutput): PromotionalMaterialResponseDto {
    return {
      id: output.publicId,
      title: output.title,
      description: output.description,
      fileUrl: output.fileUrl,
      fileFormat: output.fileFormat,
      fileSizeBytes: output.fileSizeBytes,
      position: output.position,
    };
  }
}

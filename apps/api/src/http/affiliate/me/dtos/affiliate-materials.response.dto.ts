import { ApiProperty } from '@nestjs/swagger';
import {
  AffiliateMaterialsResponse,
  AffiliateTrainingModule,
  MaterialFileFormatEnum,
  PromotionalMaterial,
} from '@porto/contracts';
import {
  AffiliateMaterialsOutput,
  AffiliateTrainingModuleOutput,
} from '@Application/materials/get-affiliate-materials.use-case';
import { PromotionalMaterialOutput } from '@Application/materials/material.output';

export class AffiliateTrainingModuleDto implements AffiliateTrainingModule {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ format: 'uri' })
  videoUrl: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ description: 'Se quem pediu já marcou o módulo como assistido' })
  completed: boolean;

  static from(output: AffiliateTrainingModuleOutput): AffiliateTrainingModuleDto {
    return {
      id: output.publicId,
      title: output.title,
      description: output.description,
      videoUrl: output.videoUrl,
      durationMinutes: output.durationMinutes,
      completed: output.completed,
    };
  }
}

export class AffiliatePromotionalMaterialDto implements PromotionalMaterial {
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

  @ApiProperty({ description: 'Em bytes' })
  fileSizeBytes: number;

  static from(output: PromotionalMaterialOutput): AffiliatePromotionalMaterialDto {
    return {
      id: output.publicId,
      title: output.title,
      description: output.description,
      fileUrl: output.fileUrl,
      fileFormat: output.fileFormat,
      fileSizeBytes: output.fileSizeBytes,
    };
  }
}

export class AffiliateMaterialsResponseDto implements AffiliateMaterialsResponse {
  @ApiProperty({ type: [AffiliateTrainingModuleDto], description: 'Na ordem da trilha' })
  trainingModules: AffiliateTrainingModuleDto[];

  @ApiProperty({ type: [AffiliatePromotionalMaterialDto] })
  promotionalMaterials: AffiliatePromotionalMaterialDto[];

  static from(output: AffiliateMaterialsOutput): AffiliateMaterialsResponseDto {
    return {
      trainingModules: output.trainingModules.map(AffiliateTrainingModuleDto.from),
      promotionalMaterials: output.promotionalMaterials.map(AffiliatePromotionalMaterialDto.from),
    };
  }
}

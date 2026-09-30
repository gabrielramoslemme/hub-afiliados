import { ApiProperty } from '@nestjs/swagger';
import { AdminTrainingModule } from '@porto/contracts';
import { TrainingModuleOutput } from '@Application/materials/list-training-modules.use-case';

export class TrainingModuleResponseDto implements AdminTrainingModule {
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

  @ApiProperty({ description: 'A ordem na trilha' })
  position: number;

  static from(output: TrainingModuleOutput): TrainingModuleResponseDto {
    return {
      id: output.publicId,
      title: output.title,
      description: output.description,
      videoUrl: output.videoUrl,
      durationMinutes: output.durationMinutes,
      position: output.position,
    };
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OccupationEnum } from '@porto/contracts';
import { ChangeOccupationInput } from '@Application/affiliates/change-occupation.use-case';

/** Espelha o `changeOccupationSchema` de `@porto/contracts`. */
export class ChangeOccupationRequestDto implements Omit<ChangeOccupationInput, 'userPublicId'> {
  @ApiProperty({ enum: OccupationEnum, example: OccupationEnum.CONTENT_CREATOR })
  @IsEnum(OccupationEnum, { message: 'Escolha sua ocupação.' })
  occupation: OccupationEnum;
}

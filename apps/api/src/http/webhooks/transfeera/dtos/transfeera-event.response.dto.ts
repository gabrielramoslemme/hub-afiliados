import { ApiProperty } from '@nestjs/swagger';
import { PayoutEventOutcomeEnum } from '@porto/contracts';

export class TransfeeraEventResponseDto {
  @ApiProperty({
    enum: PayoutEventOutcomeEnum,
    nullable: true,
    description: 'Nulo no teste de URL que a Transfeera faz ao cadastrar o webhook',
  })
  outcome: PayoutEventOutcomeEnum | null;
}

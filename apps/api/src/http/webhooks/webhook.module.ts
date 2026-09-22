import { Module } from '@nestjs/common';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { PortoIncentivesController } from './porto/porto-incentives.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [PortoIncentivesController],
})
export class WebhookModule {}

import { Module } from '@nestjs/common';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { PortoIncentivesController } from './porto/porto-incentives.controller';
import { TransfeeraWebhookController } from './transfeera/transfeera-webhook.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [PortoIncentivesController, TransfeeraWebhookController],
})
export class WebhookModule {}

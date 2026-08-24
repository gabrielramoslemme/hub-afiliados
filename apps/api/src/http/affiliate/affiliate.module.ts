import { Module } from '@nestjs/common';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { AffiliatesController } from './affiliates/affiliates.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [AffiliatesController],
})
export class AffiliateChannelModule {}

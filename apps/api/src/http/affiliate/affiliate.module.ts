import { Module } from '@nestjs/common';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { AffiliatesController } from './affiliates/affiliates.controller';
import { AffiliateAuthController } from './auth/affiliate-auth.controller';
import { AffiliateMeController } from './me/affiliate-me.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [AffiliatesController, AffiliateAuthController, AffiliateMeController],
})
export class AffiliateChannelModule {}

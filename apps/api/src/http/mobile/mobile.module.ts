import { Module } from '@nestjs/common';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { MobileAffiliatesController } from './affiliates/mobile-affiliates.controller';
import { MobileTermsController } from './terms/mobile-terms.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [MobileTermsController, MobileAffiliatesController],
})
export class MobileModule {}

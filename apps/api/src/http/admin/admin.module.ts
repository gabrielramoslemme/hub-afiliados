import { Module } from '@nestjs/common';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { AdminAffiliatesController } from './affiliates/admin-affiliates.controller';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminCouponsController } from './coupons/admin-coupons.controller';
import { AdminPromotionalMaterialsController } from './materials/admin-promotional-materials.controller';
import { AdminTrainingModulesController } from './materials/admin-training-modules.controller';
import { AdminMeController } from './me/admin-me.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [
    AdminAuthController,
    AdminMeController,
    AdminAffiliatesController,
    AdminCouponsController,
    AdminTrainingModulesController,
    AdminPromotionalMaterialsController,
  ],
})
export class AdminModule {}

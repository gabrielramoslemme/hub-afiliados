import { Module } from '@nestjs/common';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { AdminAffiliatesController } from './affiliates/admin-affiliates.controller';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminCouponsController } from './coupons/admin-coupons.controller';
import { AdminWithdrawalsController } from './withdrawals/admin-withdrawals.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [
    AdminAuthController,
    AdminAffiliatesController,
    AdminCouponsController,
    AdminWithdrawalsController,
  ],
})
export class AdminModule {}

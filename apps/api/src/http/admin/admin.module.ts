import { Module } from '@nestjs/common';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { AdminAuthController } from './auth/admin-auth.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [AdminAuthController],
})
export class AdminModule {}

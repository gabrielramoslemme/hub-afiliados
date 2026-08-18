import { Module } from '@nestjs/common';
import { AppConfigModule } from '@Infra/config/config.module';
import { DatabaseModule } from '@Infra/database/typeorm/typeorm.module';
import { AdminModule } from '@Modules/admin/admin.module';
import { HealthModule } from '@Modules/health/health.module';
import { MobileModule } from '@Modules/mobile/mobile.module';
import { WebhookModule } from '@Modules/webhooks/webhook.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule, MobileModule, AdminModule, WebhookModule],
})
export class AppModule {}

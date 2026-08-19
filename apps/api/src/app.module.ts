import { Module } from '@nestjs/common';
import { AdminModule } from '@Http/admin/admin.module';
import { HealthModule } from '@Http/health/health.module';
import { MobileModule } from '@Http/mobile/mobile.module';
import { WebhookModule } from '@Http/webhooks/webhook.module';
import { AppConfigModule } from '@Infra/config/config.module';
import { DatabaseModule } from '@Infra/database/typeorm/typeorm.module';
import { MailModule } from '@Infra/services/email/mail.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    MailModule,
    HealthModule,
    MobileModule,
    AdminModule,
    WebhookModule,
  ],
})
export class AppModule {}

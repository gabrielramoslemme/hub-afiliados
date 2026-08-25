import { Module } from '@nestjs/common';
import { AdminModule } from '@Http/admin/admin.module';
import { AffiliateChannelModule } from '@Http/affiliate/affiliate.module';
import { HealthModule } from '@Http/health/health.module';
import { WebhookModule } from '@Http/webhooks/webhook.module';
import { AppConfigModule } from '@Infra/config/config.module';
import { DatabaseModule } from '@Infra/database/typeorm/typeorm.module';
import { AuthServicesModule } from '@Infra/services/auth/auth-services.module';
import { ClockModule } from '@Infra/services/clock/clock.module';
import { MailModule } from '@Infra/services/email/mail.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthServicesModule,
    ClockModule,
    MailModule,
    HealthModule,
    AffiliateChannelModule,
    AdminModule,
    WebhookModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from '@Http/admin/admin.module';
import { AffiliateChannelModule } from '@Http/affiliate/affiliate.module';
import { HealthModule } from '@Http/health/health.module';
import { AuthenticatedGuard } from '@Http/shared/guards/authenticated.guard';
import { WebhookModule } from '@Http/webhooks/webhook.module';
import { AppConfigModule } from '@Infra/config/config.module';
import { DatabaseModule } from '@Infra/database/typeorm/typeorm.module';
import { AuthServicesModule } from '@Infra/services/auth/auth-services.module';
import { ClockModule } from '@Infra/services/clock/clock.module';
import { CouponGatewayModule } from '@Infra/services/coupons/coupon-gateway.module';
import { MailModule } from '@Infra/services/email/mail.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthServicesModule,
    ClockModule,
    MailModule,
    CouponGatewayModule,
    HealthModule,
    AffiliateChannelModule,
    AdminModule,
    WebhookModule,
  ],
  // Negação por omissão: rota nova nasce protegida, e liberar exige o
  // `@Public()` escrito. O contrário — proteger rota a rota — falha em silêncio
  // no dia em que alguém esquecer.
  providers: [{ provide: APP_GUARD, useClass: AuthenticatedGuard }],
})
export class AppModule {}

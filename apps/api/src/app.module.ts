import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerStorageService } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { AdminModule } from '@Http/admin/admin.module';
import { AffiliateChannelModule } from '@Http/affiliate/affiliate.module';
import { HealthModule } from '@Http/health/health.module';
import { AuthenticatedGuard } from '@Http/shared/guards/authenticated.guard';
import { ThrottleGuard } from '@Http/shared/throttling/throttle.guard';
import { SENSITIVE_THROTTLER, THROTTLERS } from '@Http/shared/throttling/throttle-limits';
import { WebhookModule } from '@Http/webhooks/webhook.module';
import { AppConfigModule } from '@Infra/config/config.module';
import { DatabaseModule } from '@Infra/database/typeorm/typeorm.module';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { AuthServicesModule } from '@Infra/services/auth/auth-services.module';
import { ClockModule } from '@Infra/services/clock/clock.module';
import { CouponGatewayModule } from '@Infra/services/coupons/coupon-gateway.module';
import { MailModule } from '@Infra/services/email/mail.module';
import { PostgresThrottlerStorage } from '@Infra/services/throttling/postgres-throttler.storage';
import { RoutedThrottlerStorage } from '@Infra/services/throttling/routed-throttler.storage';

@Module({
  imports: [
    AppConfigModule,
    // O limite curto conta no Postgres, para sobreviver a deploy e valer entre
    // instâncias; o folgado, em memória. Ver `RoutedThrottlerStorage`.
    ThrottlerModule.forRootAsync({
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => ({
        throttlers: THROTTLERS,
        storage: new RoutedThrottlerStorage(
          new ThrottlerStorageService(),
          new PostgresThrottlerStorage(dataSource),
          [SENSITIVE_THROTTLER],
        ),
      }),
    }),
    DatabaseModule,
    // O guard global confere a sessão no banco, por um use case.
    UseCasesModule,
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
  //
  // O limite vem antes da sessão: quem insiste sem token também conta.
  providers: [
    { provide: APP_GUARD, useClass: ThrottleGuard },
    { provide: APP_GUARD, useClass: AuthenticatedGuard },
  ],
})
export class AppModule {}

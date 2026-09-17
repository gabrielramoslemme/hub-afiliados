import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { COUPON_GATEWAY } from '@Domain/coupons/coupon-gateway';
import { CLOCK, Clock } from '@Domain/shared/clock';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { ClockModule } from '@Infra/services/clock/clock.module';
import { PortoCouponGateway } from './porto-coupon.gateway';
import { SensediaTokenProvider } from './sensedia-token.provider';

@Global()
@Module({
  imports: [ClockModule],
  providers: [
    {
      provide: COUPON_GATEWAY,
      inject: [ConfigService, CLOCK],
      // Autenticar no gateway e saber o que é um cupom são trabalhos
      // diferentes, então são duas peças — a mesma divisão que `MailRenderer` e
      // `MailProvider` fazem do lado do e-mail.
      useFactory: (configService: ConfigService<EnvironmentVariables, true>, clock: Clock) => {
        const timeoutMs = configService.get('PORTO_API_TIMEOUT_MS', { infer: true });
        const tokenProvider = new SensediaTokenProvider(
          {
            oauthUrl: configService.get('PORTO_OAUTH_URL', { infer: true }),
            clientId: configService.get('PORTO_CLIENT_ID', { infer: true }),
            clientSecret: configService.get('PORTO_CLIENT_SECRET', { infer: true }),
            timeoutMs,
          },
          clock,
        );

        return new PortoCouponGateway(
          {
            apiBaseUrl: configService.get('PORTO_API_BASE_URL', { infer: true }),
            apiBasePath: configService.get('PORTO_API_BASE_PATH', { infer: true }),
            timeoutMs,
          },
          tokenProvider,
        );
      },
    },
  ],
  exports: [COUPON_GATEWAY],
})
export class CouponGatewayModule {}

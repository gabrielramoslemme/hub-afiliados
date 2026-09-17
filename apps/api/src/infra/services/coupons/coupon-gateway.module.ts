import { Global, Module } from '@nestjs/common';
import { COUPON_GATEWAY } from '@Domain/coupons/coupon-gateway';
import { CLOCK, Clock } from '@Domain/shared/clock';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { ClockModule } from '@Infra/services/clock/clock.module';
import { PortoCouponGateway } from './porto-coupon.gateway';
import { SensediaTokenProvider } from './sensedia-token.provider';

@Global()
@Module({
  imports: [ClockModule],
  providers: [
    {
      provide: COUPON_GATEWAY,
      inject: [EnvironmentVariableService, CLOCK],
      // Autenticar no gateway e saber o que é um cupom são trabalhos
      // diferentes, então são duas peças — a mesma divisão que `MailRenderer` e
      // `MailProvider` fazem do lado do e-mail.
      useFactory: (environmentVariableService: EnvironmentVariableService, clock: Clock) => {
        const tokenProvider = new SensediaTokenProvider(
          {
            oauthUrl: environmentVariableService.portoOauthUrl,
            clientId: environmentVariableService.portoClientId,
            clientSecret: environmentVariableService.portoClientSecret,
            timeoutMs: environmentVariableService.portoApiTimeoutMs,
          },
          clock,
        );

        return new PortoCouponGateway(
          {
            apiBaseUrl: environmentVariableService.portoApiBaseUrl,
            apiBasePath: environmentVariableService.portoApiBasePath,
            timeoutMs: environmentVariableService.portoApiTimeoutMs,
          },
          tokenProvider,
        );
      },
    },
  ],
  exports: [COUPON_GATEWAY],
})
export class CouponGatewayModule {}

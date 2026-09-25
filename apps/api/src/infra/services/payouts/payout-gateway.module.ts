import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLOCK, Clock } from '@Domain/shared/clock';
import { PAYOUT_GATEWAY } from '@Domain/withdrawals/payout-gateway';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { ClockModule } from '@Infra/services/clock/clock.module';
import { TransfeeraPayoutGateway } from './transfeera-payout.gateway';
import { TransfeeraTokenProvider } from './transfeera-token.provider';

@Global()
@Module({
  imports: [ClockModule],
  providers: [
    {
      provide: PAYOUT_GATEWAY,
      inject: [ConfigService, CLOCK],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>, clock: Clock) => {
        const clientId = configService.get('TRANSFEERA_CLIENT_ID', { infer: true });
        const clientSecret = configService.get('TRANSFEERA_CLIENT_SECRET', { infer: true });
        const userAgent = configService.get('TRANSFEERA_USER_AGENT', { infer: true });
        const timeoutMs = configService.get('TRANSFEERA_TIMEOUT_MS', { infer: true });

        const tokenProvider = new TransfeeraTokenProvider(
          {
            authUrl: configService.get('TRANSFEERA_AUTH_URL', { infer: true }),
            clientId,
            clientSecret,
            userAgent,
            timeoutMs,
          },
          clock,
        );

        return new TransfeeraPayoutGateway(
          {
            apiBaseUrl: configService.get('TRANSFEERA_API_BASE_URL', { infer: true }),
            userAgent,
            timeoutMs,
            enabled: Boolean(clientId && clientSecret),
          },
          tokenProvider,
        );
      },
    },
  ],
  exports: [PAYOUT_GATEWAY],
})
export class PayoutGatewayModule {}

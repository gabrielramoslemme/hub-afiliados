import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLOCK, Clock } from '@Domain/shared/clock';
import { PAYOUT_GATEWAY, PAYOUT_NOTIFICATION_TRANSLATOR } from '@Domain/withdrawals/payout-gateway';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { ClockModule } from '@Infra/services/clock/clock.module';
import { TransfeeraPayoutGateway } from './transfeera-payout.gateway';
import { TransfeeraTokenProvider } from './transfeera-token.provider';
import { TransfeeraNotificationTranslator } from './transfeera-transfer';

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

        const enabled = Boolean(clientId && clientSecret);
        // O saque sai, mas o desfecho não volta: o webhook recusa tudo com 401 e
        // só a reconciliação, a cada rodada, fecha o que ficou em processamento.
        if (enabled && !configService.get('TRANSFEERA_WEBHOOK_SECRET', { infer: true })) {
          new Logger(PayoutGatewayModule.name).warn(
            'Saque via PIX ligado sem TRANSFEERA_WEBHOOK_SECRET: o webhook da Transfeera vai recusar toda chamada',
          );
        }

        return new TransfeeraPayoutGateway(
          {
            apiBaseUrl: configService.get('TRANSFEERA_API_BASE_URL', { infer: true }),
            userAgent,
            timeoutMs,
            enabled,
          },
          tokenProvider,
        );
      },
    },
    { provide: PAYOUT_NOTIFICATION_TRANSLATOR, useValue: new TransfeeraNotificationTranslator() },
  ],
  exports: [PAYOUT_GATEWAY, PAYOUT_NOTIFICATION_TRANSLATOR],
})
export class PayoutGatewayModule {}

import { Global, Module } from '@nestjs/common';
import { MAILER } from '@Domain/notifications/mailer';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { LoggerMailProvider } from './logger-mail.provider';
import { MailService } from './mail.service';
import { MAIL_PROVIDER } from './mail-provider.interface';
import { MailerSendProvider } from './mailersend.provider';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      inject: [EnvironmentVariableService],
      useFactory: (env: EnvironmentVariableService) =>
        env.mailProvider === 'mailersend' ? new MailerSendProvider(env) : new LoggerMailProvider(),
    },
    { provide: MAILER, useClass: MailService },
  ],
  exports: [MAILER],
})
export class MailModule {}

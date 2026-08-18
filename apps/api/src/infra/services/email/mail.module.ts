import { Global, Module } from '@nestjs/common';
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
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}

import { Global, Module } from '@nestjs/common';
import { LINK_BUILDER } from '@Domain/notifications/link-builder';
import { MAILER } from '@Domain/notifications/mailer';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { AppLinkBuilder } from '@Infra/services/links/app-link-builder';
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
    // O link mora aqui porque é o que a gente manda para as pessoas: quem
    // envia e quem monta o endereço do e-mail são o mesmo assunto.
    { provide: LINK_BUILDER, useClass: AppLinkBuilder },
  ],
  exports: [MAILER, LINK_BUILDER],
})
export class MailModule {}

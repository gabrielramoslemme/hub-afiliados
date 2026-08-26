import { Global, Module } from '@nestjs/common';
import { LINK_BUILDER } from '@Domain/notifications/link-builder';
import { MAILER } from '@Domain/notifications/mailer';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { AppLinkBuilder } from '@Infra/services/links/app-link-builder';
import { LoggerMailProvider } from './logger-mail.provider';
import { MailService } from './mail.service';
import { MAIL_PROVIDER } from './mail-provider.interface';
import { MAIL_RENDERER } from './mail-renderer.interface';
import { ReactEmailRenderer } from './react-email.renderer';
import { ResendProvider } from './resend.provider';

@Global()
@Module({
  providers: [
    // Renderizar e despachar são portes separados de propósito: o conteúdo é o
    // mesmo em qualquer fornecedor, e trocar de fornecedor não pode reescrevê-lo.
    { provide: MAIL_RENDERER, useClass: ReactEmailRenderer },
    {
      provide: MAIL_PROVIDER,
      inject: [EnvironmentVariableService],
      useFactory: (env: EnvironmentVariableService) =>
        env.mailProvider === 'resend' ? new ResendProvider(env) : new LoggerMailProvider(),
    },
    { provide: MAILER, useClass: MailService },
    // O link mora aqui porque é o que a gente manda para as pessoas: quem
    // envia e quem monta o endereço do e-mail são o mesmo assunto.
    { provide: LINK_BUILDER, useClass: AppLinkBuilder },
  ],
  exports: [MAILER, LINK_BUILDER],
})
export class MailModule {}

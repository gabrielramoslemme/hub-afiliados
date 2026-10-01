import { Global, Module } from '@nestjs/common';
import { LINK_BUILDER } from '@Domain/notifications/link-builder';
import { MAILER } from '@Domain/notifications/mailer';
import { AppLinkBuilder } from '@Infra/services/links/app-link-builder';
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
    // Um fornecedor só, em todo ambiente: um envio que só registra no log já
    // levou o link de definir senha, em claro, para o CloudWatch. O e2e troca
    // este provider pelo `FakeMailProvider`.
    { provide: MAIL_PROVIDER, useClass: ResendProvider },
    { provide: MAILER, useClass: MailService },
    // O link mora aqui porque é o que a gente manda para as pessoas: quem
    // envia e quem monta o endereço do e-mail são o mesmo assunto.
    { provide: LINK_BUILDER, useClass: AppLinkBuilder },
  ],
  exports: [MAILER, LINK_BUILDER],
})
export class MailModule {}

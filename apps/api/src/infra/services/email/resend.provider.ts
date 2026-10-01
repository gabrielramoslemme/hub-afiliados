import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { MailProvider, SendRenderedMailInput } from './mail-provider.interface';

/** O nome vai entre aspas no cabeçalho (RFC 5322), e aspas dentro dele o quebrariam. */
function formatSender(name: string, email: string): string {
  return `"${name.replace(/["\\]/g, '')}" <${email}>`;
}

@Injectable()
export class ResendProvider implements MailProvider {
  private client: Resend | null = null;

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  /*
    Criado no primeiro envio, e não na construção: o SDK lança sem chave, e a
    chave é opcional — a API sobe sem ela, e a geração do OpenAPI da CI sobe o
    AppModule inteiro. Sem chave o envio falha aqui, e o MailService registra.
  */
  private resend(): Resend {
    if (this.client) return this.client;

    const apiKey = this.configService.get('RESEND_API_KEY', { infer: true });
    if (!apiKey) throw new Error('RESEND_API_KEY ausente: e-mail não enviado');

    this.client = new Resend(apiKey);
    return this.client;
  }

  async send(input: SendRenderedMailInput): Promise<void> {
    const { error } = await this.resend().emails.send({
      from: formatSender(
        this.configService.get('MAIL_FROM_NAME', { infer: true }),
        this.configService.get('MAIL_FROM_EMAIL', { infer: true }),
      ),
      // O destinatário vai como endereço puro, sem nome de exibição: é o formato
      // que a API documenta para `to`, e a restrição de conta sem domínio
      // verificado compara a string crua — `"Nome" <e-mail>` é recusado ali
      // mesmo quando o endereço é o único permitido.
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    // O SDK resolve a promessa mesmo quando a API recusa o envio: sem conferir o
    // corpo, uma falha passaria por sucesso e o MailService não teria o que logar.
    if (error) throw new Error(`${error.name}: ${error.message}`);
  }
}

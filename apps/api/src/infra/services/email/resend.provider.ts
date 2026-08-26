import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { MailProvider, SendRenderedMailInput } from './mail-provider.interface';

/** O nome vai entre aspas no cabeçalho (RFC 5322), e aspas dentro dele o quebrariam. */
function formatSender(name: string, email: string): string {
  return `"${name.replace(/["\\]/g, '')}" <${email}>`;
}

@Injectable()
export class ResendProvider implements MailProvider {
  private readonly client: Resend;

  constructor(private readonly environmentVariableService: EnvironmentVariableService) {
    this.client = new Resend(this.environmentVariableService.resendApiKey);
  }

  async send(input: SendRenderedMailInput): Promise<void> {
    const { error } = await this.client.emails.send({
      from: formatSender(
        this.environmentVariableService.mailFromName,
        this.environmentVariableService.mailFromEmail,
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

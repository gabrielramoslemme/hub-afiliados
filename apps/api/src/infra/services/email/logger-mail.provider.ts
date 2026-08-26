import { Injectable, Logger } from '@nestjs/common';
import { MailProvider, SendRenderedMailInput } from './mail-provider.interface';

@Injectable()
export class LoggerMailProvider implements MailProvider {
  private readonly logger = new Logger(LoggerMailProvider.name);

  async send(input: SendRenderedMailInput): Promise<void> {
    // O corpo em texto vai junto porque é ele que deixa o link à mão em
    // desenvolvimento, onde nenhum e-mail chega a sair.
    this.logger.log(
      `[email simulado] para=${input.toName} <${input.to}> assunto=${input.subject}\n${input.text}`,
    );
    return Promise.resolve();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { SendMailInput } from '@Domain/notifications/mailer';
import { MailProvider } from './mail-provider.interface';

@Injectable()
export class LoggerMailProvider implements MailProvider {
  private readonly logger = new Logger(LoggerMailProvider.name);

  async send(input: SendMailInput): Promise<void> {
    this.logger.log(
      `[email simulado] template=${input.template} variáveis=${JSON.stringify(input.variables)}`,
    );
    return Promise.resolve();
  }
}

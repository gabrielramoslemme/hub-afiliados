import { Inject, Injectable, Logger } from '@nestjs/common';
import { Mailer, SendMailInput } from '@Domain/notifications/mailer';
import { MAIL_PROVIDER, type MailProvider } from './mail-provider.interface';

@Injectable()
export class MailService implements Mailer {
  private readonly logger = new Logger(MailService.name);

  constructor(@Inject(MAIL_PROVIDER) private readonly mailProvider: MailProvider) {}

  /**
   * Nunca lança. Um e-mail que não saiu é um incidente operacional;
   * uma aprovação revertida por causa dele seria um incidente de negócio.
   */
  async send(input: SendMailInput): Promise<void> {
    try {
      await this.mailProvider.send(input);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail do template ${input.template}`,
        (error as Error)?.stack,
      );
    }
  }
}

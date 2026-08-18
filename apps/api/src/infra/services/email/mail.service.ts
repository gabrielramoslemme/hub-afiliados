import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAIL_PROVIDER, MailProvider, SendMailInput } from './mail-provider.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  /**
   * Nunca lança. Um e-mail que não saiu é um incidente operacional;
   * uma aprovação revertida por causa dele seria um incidente de negócio.
   */
  async send(input: SendMailInput): Promise<void> {
    try {
      await this.provider.send(input);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail do template ${input.template}`,
        (error as Error)?.stack,
      );
    }
  }
}

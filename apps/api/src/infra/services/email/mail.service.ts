import { Inject, Injectable, Logger } from '@nestjs/common';
import { Mailer, SendMailInput } from '@Domain/notifications/mailer';
import { MAIL_PROVIDER, type MailProvider } from './mail-provider.interface';
import { MAIL_RENDERER, type MailRenderer } from './mail-renderer.interface';

@Injectable()
export class MailService implements Mailer {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_RENDERER) private readonly mailRenderer: MailRenderer,
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProvider,
  ) {}

  /**
   * Nunca lança. Um e-mail que não saiu é um incidente operacional;
   * uma aprovação revertida por causa dele seria um incidente de negócio.
   */
  async send(input: SendMailInput): Promise<void> {
    try {
      const rendered = await this.mailRenderer.render(input);
      await this.mailProvider.send({ ...rendered, to: input.to, toName: input.toName });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail do template ${input.template}`,
        (error as Error)?.stack,
      );
    }
  }
}

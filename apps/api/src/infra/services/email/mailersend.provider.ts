import { Injectable } from '@nestjs/common';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import { MailProvider, SendMailInput } from '@Domain/notifications/mail.provider';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { MAIL_SUBJECT, MAIL_TEMPLATE_ENV_KEY } from './templates/mail-template.config';

@Injectable()
export class MailerSendProvider implements MailProvider {
  private readonly client: MailerSend;

  constructor(private readonly env: EnvironmentVariableService) {
    this.client = new MailerSend({ apiKey: this.env.mailerSendApiKey });
  }

  async send(input: SendMailInput): Promise<void> {
    const templateId = this.env.mailTemplateId(MAIL_TEMPLATE_ENV_KEY[input.template]);
    if (!templateId) throw new Error(`Template não configurado: ${input.template}`);

    const params = new EmailParams()
      .setFrom(new Sender(this.env.mailFromEmail, this.env.mailFromName))
      .setTo([new Recipient(input.to, input.toName)])
      .setSubject(MAIL_SUBJECT[input.template])
      .setTemplateId(templateId)
      .setPersonalization([{ email: input.to, data: input.variables }]);

    await this.client.email.send(params);
  }
}

import { Injectable } from '@nestjs/common';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import { SendMailInput } from '@Domain/notifications/mailer';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { MailProvider } from './mail-provider.interface';
import { MAIL_SUBJECT, MAIL_TEMPLATE_ENV_KEY } from './templates/mail-template.config';

@Injectable()
export class MailerSendProvider implements MailProvider {
  private readonly client: MailerSend;

  constructor(private readonly environmentVariableService: EnvironmentVariableService) {
    this.client = new MailerSend({ apiKey: this.environmentVariableService.mailerSendApiKey });
  }

  async send(input: SendMailInput): Promise<void> {
    const templateId = this.environmentVariableService.mailTemplateId(
      MAIL_TEMPLATE_ENV_KEY[input.template],
    );
    if (!templateId) throw new Error(`Template não configurado: ${input.template}`);

    const params = new EmailParams()
      .setFrom(
        new Sender(
          this.environmentVariableService.mailFromEmail,
          this.environmentVariableService.mailFromName,
        ),
      )
      .setTo([new Recipient(input.to, input.toName)])
      .setSubject(MAIL_SUBJECT[input.template])
      .setTemplateId(templateId)
      .setPersonalization([{ email: input.to, data: input.variables }]);

    await this.client.email.send(params);
  }
}

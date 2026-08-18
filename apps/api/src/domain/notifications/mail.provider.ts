import { MailTemplateEnum } from '@porto/contracts';

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

export interface SendMailInput {
  template: MailTemplateEnum;
  to: string;
  toName: string;
  variables: Record<string, string>;
}

export interface MailProvider {
  send(input: SendMailInput): Promise<void>;
}

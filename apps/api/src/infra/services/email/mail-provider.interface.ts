import { MailTemplateEnum } from '@porto/contracts';

export interface SendMailInput {
  template: MailTemplateEnum;
  to: string;
  toName: string;
  variables: Record<string, string>;
}

export interface MailProvider {
  send(input: SendMailInput): Promise<void>;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

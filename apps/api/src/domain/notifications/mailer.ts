import { MailTemplateEnum } from '@porto/contracts';

export const MAILER = Symbol('MAILER');

export interface SendMailInput {
  template: MailTemplateEnum;
  to: string;
  toName: string;
  variables: Record<string, string>;
}

/**
 * O que a aplicação precisa: enviar. Quantos fornecedores existem por trás,
 * e qual está ligado, é assunto de infra.
 */
export interface Mailer {
  send(input: SendMailInput): Promise<void>;
}

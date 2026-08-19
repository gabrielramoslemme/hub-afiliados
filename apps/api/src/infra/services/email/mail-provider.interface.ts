import { SendMailInput } from '@Domain/notifications/mailer';

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

/** Fornecedor concreto por trás do `Mailer`. Escolhido por `MAIL_PROVIDER` na subida. */
export interface MailProvider {
  send(input: SendMailInput): Promise<void>;
}

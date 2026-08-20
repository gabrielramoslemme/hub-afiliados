import { SendMailInput } from '@Domain/notifications/mailer';
import { createToken } from '@Domain/shared/token';

export const MAIL_PROVIDER = createToken<MailProvider>('MAIL_PROVIDER');

/** Fornecedor concreto por trás do `Mailer`. Escolhido por `MAIL_PROVIDER` na subida. */
export interface MailProvider {
  send(input: SendMailInput): Promise<void>;
}

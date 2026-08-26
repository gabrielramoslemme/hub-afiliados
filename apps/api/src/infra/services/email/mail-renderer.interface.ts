import { SendMailInput } from '@Domain/notifications/mailer';
import { createToken } from '@Domain/shared/token';

export const MAIL_RENDERER = createToken<MailRenderer>('MAIL_RENDERER');

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Transforma o pedido da aplicação no conteúdo pronto para despachar. Não
 * conhece fornecedor: o mesmo HTML serve o Resend e o provider de log.
 */
export interface MailRenderer {
  render(input: SendMailInput): Promise<RenderedMail>;
}

import { createToken } from '@Domain/shared/token';
import { RenderedMail } from './mail-renderer.interface';

export const MAIL_PROVIDER = createToken<MailProvider>('MAIL_PROVIDER');

export interface SendRenderedMailInput extends RenderedMail {
  to: string;
  toName: string;
}

/**
 * Transporte, e nada mais: recebe o conteúdo já renderizado e o entrega ao
 * fornecedor concreto, escolhido por `MAIL_PROVIDER` na subida.
 */
export interface MailProvider {
  send(input: SendRenderedMailInput): Promise<void>;
}

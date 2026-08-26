import { Injectable } from '@nestjs/common';
import { plainTextSelectors, render as renderElement } from '@react-email/render';
import { SendMailInput } from '@Domain/notifications/mailer';
import { MailRenderer, RenderedMail } from './mail-renderer.interface';
import { MAIL_TEMPLATES } from './templates/template-registry';

// O html-to-text põe título em caixa alta por padrão, e em português isso vira
// grito. Os seletores do react-email seguem junto porque são eles que mantêm o
// texto de pré-visualização fora do corpo.
const PLAIN_TEXT_SELECTORS = [
  ...plainTextSelectors,
  ...['h1', 'h2', 'h3'].map((selector) => ({ selector, options: { uppercase: false } })),
];

@Injectable()
export class ReactEmailRenderer implements MailRenderer {
  async render(input: SendMailInput): Promise<RenderedMail> {
    const template = MAIL_TEMPLATES[input.template];

    const missing = template.requiredVariables.filter((name) => !input.variables[name]);
    // Lançar aqui é o que transforma variável esquecida em log nomeado pelo
    // MailService. Renderizar assim mesmo mandaria "undefined" para a pessoa.
    if (missing.length > 0) {
      throw new Error(`Variáveis ausentes no template ${input.template}: ${missing.join(', ')}`);
    }

    const element = template.build(input.variables);
    const [html, text] = await Promise.all([
      renderElement(element),
      renderElement(element, {
        plainText: true,
        htmlToTextOptions: { selectors: PLAIN_TEXT_SELECTORS },
      }),
    ]);

    return { subject: template.subject, html, text };
  }
}

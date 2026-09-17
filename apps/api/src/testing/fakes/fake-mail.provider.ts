import { MailProvider, SendRenderedMailInput } from '@Infra/services/email/mail-provider.interface';

/**
 * O fornecedor de e-mail do e2e: guarda em memória o e-mail **já renderizado**,
 * no lugar de despachá-lo. Trocar aqui, e não o `MAILER`, é o que mantém o
 * `ReactEmailRenderer` no caminho — e é ele que falha quando o use case e o
 * template divergem no nome de uma variável. O `MailService` engole essa falha
 * de propósito, então o único sinal que sobra é o e-mail não ter chegado.
 */
export class FakeMailProvider implements MailProvider {
  private readonly sent: SendRenderedMailInput[] = [];

  async send(input: SendRenderedMailInput): Promise<void> {
    this.sent.push(input);
  }

  /** O que foi para aquele endereço, do mais antigo ao mais novo. */
  sentTo(email: string): SendRenderedMailInput[] {
    return this.sent.filter((mail) => mail.to === email);
  }

  clear(): void {
    this.sent.length = 0;
  }
}

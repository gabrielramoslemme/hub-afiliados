import { AuthAudienceEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';

export const LINK_BUILDER = createToken<LinkBuilder>('LINK_BUILDER');

/**
 * Onde o portal do afiliado mora é configuração de ambiente, e ler variável de
 * ambiente é de infra. O use case só quer o endereço que vai no e-mail.
 */
export interface LinkBuilder {
  setPasswordLink(token: string): string;
  /**
   * A recuperação serve aos dois públicos, e cada um redefine a senha na sua
   * tela: a audiência que pediu é o que decide para onde o link aponta.
   */
  resetPasswordLink(token: string, audience: AuthAudienceEnum): string;
}

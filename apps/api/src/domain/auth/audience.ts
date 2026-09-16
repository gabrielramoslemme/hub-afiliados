import { AuthAudienceEnum, UserTypeEnum } from '@porto/contracts';

/**
 * Cada canal atende um tipo de identidade, e a tabela `users` guarda os dois.
 * O mapa mora aqui porque a correspondência é regra — é o que faz um link de
 * recuperação do painel não valer na tela do afiliado, e vice-versa.
 */
export const USER_TYPE_BY_AUDIENCE: Record<AuthAudienceEnum, UserTypeEnum> = {
  [AuthAudienceEnum.AFFILIATE]: UserTypeEnum.AFFILIATE,
  [AuthAudienceEnum.ADMIN]: UserTypeEnum.ADMIN,
};

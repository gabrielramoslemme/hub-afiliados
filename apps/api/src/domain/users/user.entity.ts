import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { AffiliateWithCoupon } from '@Domain/affiliates/affiliate.entity';

/** Identidade unificada: afiliado e operador dividem a tabela, separados por `type`. */
export interface UserEntity {
  id: number;
  publicId: string;
  name: string;
  email: string;
  password: string | null;
  passwordSetAt: Date | null;
  shouldChangePassword: boolean;
  isActive: boolean;
  type: UserTypeEnum;
  role: UserRoleEnum | null;
  lastLoginAt: Date | null;
  /**
   * Vai no token e é conferida a cada requisição: somar um aqui encerra todas as
   * sessões abertas da conta, sem esperar o JWT vencer.
   */
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UserWithAffiliate extends UserEntity {
  /**
   * O cupom vem junto: a área do afiliado e a resposta do login mostram o
   * código, e resolvê-lo depois seria uma segunda ida ao banco em toda tela.
   */
  affiliate: AffiliateWithCoupon | null;
}

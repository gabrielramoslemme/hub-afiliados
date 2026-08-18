import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { AffiliateEntity } from '@Domain/affiliates/affiliate.entity';

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
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UserWithAffiliate extends UserEntity {
  affiliate: AffiliateEntity | null;
}

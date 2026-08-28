import { AffiliateStatusEnum, PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';
import { UserEntity } from '@Domain/users/user.entity';

export interface AffiliateEntity {
  id: number;
  publicId: string;
  userId: number;
  cpf: string;
  rg: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  /** Rede e `@` andam juntos: ou os dois têm valor, ou os dois são nulos. */
  socialNetwork: SocialNetworkEnum | null;
  socialHandle: string | null;
  status: AffiliateStatusEnum;
  approvedAt: Date | null;
  approvedByUserId: number | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateWithUser extends AffiliateEntity {
  user: UserEntity;
}

export interface AffiliateDetail extends AffiliateWithUser {
  approvedBy: UserEntity | null;
}

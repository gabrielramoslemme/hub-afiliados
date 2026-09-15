import { AffiliateStatusEnum, PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';
import { CouponEntity } from '@Domain/coupons/coupon.entity';
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
  /** Quando a pessoa aceitou o Regulamento, no envio do cadastro. */
  termsAcceptedAt: Date;
  approvedAt: Date | null;
  approvedByUserId: number | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateWithUser extends AffiliateEntity {
  user: UserEntity;
}

/** Nulo até a aprovação: é ela que emite o cupom na Porto Serviços. */
export interface AffiliateWithCoupon extends AffiliateEntity {
  coupon: CouponEntity | null;
}

export interface AffiliateDetail extends AffiliateWithUser, AffiliateWithCoupon {
  approvedBy: UserEntity | null;
}

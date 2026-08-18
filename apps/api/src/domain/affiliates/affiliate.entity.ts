import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { TermsVersionEntity } from '@Domain/terms/terms-version.entity';
import { UserEntity } from '@Domain/users/user.entity';

export interface AffiliateEntity {
  id: number;
  publicId: string;
  userId: number;
  cpf: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  status: AffiliateStatusEnum;
  approvedAt: Date | null;
  approvedByUserId: number | null;
  rejectionReason: string | null;
  termsVersionId: number;
  termsAcceptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateWithUser extends AffiliateEntity {
  user: UserEntity;
}

export interface AffiliateDetail extends AffiliateWithUser {
  termsVersion: TermsVersionEntity;
  approvedBy: UserEntity | null;
}

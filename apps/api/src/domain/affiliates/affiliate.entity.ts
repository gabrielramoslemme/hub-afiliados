import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
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
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateWithUser extends AffiliateEntity {
  user: UserEntity;
}

export interface AffiliateDetail extends AffiliateWithUser {
  approvedBy: UserEntity | null;
}

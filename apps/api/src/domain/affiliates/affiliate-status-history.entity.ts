import { AffiliateStatusEnum } from '@porto/contracts';
import { UserEntity } from '@Domain/users/user.entity';

export interface AffiliateStatusHistoryEntity {
  id: number;
  affiliateId: number;
  fromStatus: AffiliateStatusEnum | null;
  toStatus: AffiliateStatusEnum;
  reason: string | null;
  actorUserId: number | null;
  createdAt: Date;
}

export interface AffiliateStatusHistoryWithActor extends AffiliateStatusHistoryEntity {
  actor: UserEntity | null;
}

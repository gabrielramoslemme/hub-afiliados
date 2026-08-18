import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateWithUser } from '@Domain/affiliates/affiliate.entity';
import { buildUser } from './user.factory';

let sequence = 0;

export function buildAffiliate(overrides: Partial<AffiliateWithUser> = {}): AffiliateWithUser {
  sequence += 1;
  const user = overrides.user ?? buildUser();
  return {
    id: sequence,
    publicId: `10000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    userId: user.id,
    user,
    cpf: '52998224725',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: user.email,
    status: AffiliateStatusEnum.PENDING_APPROVAL,
    approvedAt: null,
    approvedByUserId: null,
    rejectionReason: null,
    termsVersionId: 1,
    termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
    createdAt: new Date('2026-08-17T12:00:00Z'),
    updatedAt: new Date('2026-08-17T12:00:00Z'),
    ...overrides,
  };
}

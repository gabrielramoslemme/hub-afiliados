import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AFFILIATE_REPOSITORY } from '@Domain/affiliates/affiliate.repository';
import { AUDIT_LOG_REPOSITORY } from '@Domain/audit/audit-log.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@Domain/auth/password-reset-token.repository';
import { COUPON_REPOSITORY } from '@Domain/coupons/coupon.repository';
import { INCENTIVE_EVENT_REPOSITORY } from '@Domain/sales/incentive-event.repository';
import { SALE_REPOSITORY } from '@Domain/sales/sale.repository';
import { USER_REPOSITORY } from '@Domain/users/user.repository';
import { PAYOUT_EVENT_REPOSITORY } from '@Domain/withdrawals/payout-event.repository';
import { WITHDRAWAL_REPOSITORY } from '@Domain/withdrawals/withdrawal.repository';
import { AffiliateTypeormEntity } from '@Infra/database/typeorm/entities/affiliate.typeorm-entity';
import { AuditLogTypeormEntity } from '@Infra/database/typeorm/entities/audit-log.typeorm-entity';
import { CouponTypeormEntity } from '@Infra/database/typeorm/entities/coupon.typeorm-entity';
import { IncentiveEventTypeormEntity } from '@Infra/database/typeorm/entities/incentive-event.typeorm-entity';
import { PasswordResetTokenTypeormEntity } from '@Infra/database/typeorm/entities/password-reset-token.typeorm-entity';
import { PayoutEventTypeormEntity } from '@Infra/database/typeorm/entities/payout-event.typeorm-entity';
import { SaleTypeormEntity } from '@Infra/database/typeorm/entities/sale.typeorm-entity';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';
import { WithdrawalTypeormEntity } from '@Infra/database/typeorm/entities/withdrawal.typeorm-entity';
import { AffiliateTypeormRepository } from './affiliate.typeorm-repository';
import { AuditLogTypeormRepository } from './audit-log.typeorm-repository';
import { CouponTypeormRepository } from './coupon.typeorm-repository';
import { IncentiveEventTypeormRepository } from './incentive-event.typeorm-repository';
import { PasswordResetTokenTypeormRepository } from './password-reset-token.typeorm-repository';
import { PayoutEventTypeormRepository } from './payout-event.typeorm-repository';
import { SaleTypeormRepository } from './sale.typeorm-repository';
import { UserTypeormRepository } from './user.typeorm-repository';
import { WithdrawalTypeormRepository } from './withdrawal.typeorm-repository';

const REPOSITORIES = [
  { provide: USER_REPOSITORY, useClass: UserTypeormRepository },
  { provide: AFFILIATE_REPOSITORY, useClass: AffiliateTypeormRepository },
  { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useClass: PasswordResetTokenTypeormRepository },
  { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogTypeormRepository },
  { provide: COUPON_REPOSITORY, useClass: CouponTypeormRepository },
  { provide: SALE_REPOSITORY, useClass: SaleTypeormRepository },
  { provide: INCENTIVE_EVENT_REPOSITORY, useClass: IncentiveEventTypeormRepository },
  { provide: WITHDRAWAL_REPOSITORY, useClass: WithdrawalTypeormRepository },
  { provide: PAYOUT_EVENT_REPOSITORY, useClass: PayoutEventTypeormRepository },
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTypeormEntity,
      AffiliateTypeormEntity,
      PasswordResetTokenTypeormEntity,
      AuditLogTypeormEntity,
      CouponTypeormEntity,
      SaleTypeormEntity,
      IncentiveEventTypeormEntity,
      WithdrawalTypeormEntity,
      PayoutEventTypeormEntity,
    ]),
  ],
  providers: REPOSITORIES,
  exports: [...REPOSITORIES.map((repository) => repository.provide), TypeOrmModule],
})
export class RepositoriesModule {}

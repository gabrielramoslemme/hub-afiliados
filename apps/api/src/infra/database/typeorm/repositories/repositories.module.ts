import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AFFILIATE_REPOSITORY } from '@Domain/affiliates/affiliate.repository';
import { AFFILIATE_STATUS_HISTORY_REPOSITORY } from '@Domain/affiliates/affiliate-status-history.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@Domain/auth/password-reset-token.repository';
import { COUPON_REPOSITORY } from '@Domain/coupons/coupon.repository';
import { COUPON_HISTORY_REPOSITORY } from '@Domain/coupons/coupon-history.repository';
import { USER_REPOSITORY } from '@Domain/users/user.repository';
import { AffiliateTypeormEntity } from '@Infra/database/typeorm/entities/affiliate.typeorm-entity';
import { AffiliateStatusHistoryTypeormEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.typeorm-entity';
import { CouponTypeormEntity } from '@Infra/database/typeorm/entities/coupon.typeorm-entity';
import { CouponHistoryTypeormEntity } from '@Infra/database/typeorm/entities/coupon-history.typeorm-entity';
import { PasswordResetTokenTypeormEntity } from '@Infra/database/typeorm/entities/password-reset-token.typeorm-entity';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';
import { AffiliateTypeormRepository } from './affiliate.typeorm-repository';
import { AffiliateStatusHistoryTypeormRepository } from './affiliate-status-history.typeorm-repository';
import { CouponTypeormRepository } from './coupon.typeorm-repository';
import { CouponHistoryTypeormRepository } from './coupon-history.typeorm-repository';
import { PasswordResetTokenTypeormRepository } from './password-reset-token.typeorm-repository';
import { UserTypeormRepository } from './user.typeorm-repository';

const REPOSITORIES = [
  { provide: USER_REPOSITORY, useClass: UserTypeormRepository },
  { provide: AFFILIATE_REPOSITORY, useClass: AffiliateTypeormRepository },
  { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useClass: PasswordResetTokenTypeormRepository },
  {
    provide: AFFILIATE_STATUS_HISTORY_REPOSITORY,
    useClass: AffiliateStatusHistoryTypeormRepository,
  },
  { provide: COUPON_REPOSITORY, useClass: CouponTypeormRepository },
  { provide: COUPON_HISTORY_REPOSITORY, useClass: CouponHistoryTypeormRepository },
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTypeormEntity,
      AffiliateTypeormEntity,
      PasswordResetTokenTypeormEntity,
      AffiliateStatusHistoryTypeormEntity,
      CouponTypeormEntity,
      CouponHistoryTypeormEntity,
    ]),
  ],
  providers: REPOSITORIES,
  exports: [...REPOSITORIES.map((repository) => repository.provide), TypeOrmModule],
})
export class RepositoriesModule {}

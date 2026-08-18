import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AffiliateStatusHistoryRepository } from '@Domain/affiliates/affiliate-status-history.repository';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { RefreshTokenRepository } from '@Domain/auth/refresh-token.repository';
import { TermsVersionRepository } from '@Domain/terms/terms-version.repository';
import { UserRepository } from '@Domain/users/user.repository';
import { AffiliateStatusHistoryEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.entity';
import { AffiliateEntity } from '@Infra/database/typeorm/entities/affiliate.entity';
import { PasswordResetTokenEntity } from '@Infra/database/typeorm/entities/password-reset-token.entity';
import { RefreshTokenEntity } from '@Infra/database/typeorm/entities/refresh-token.entity';
import { TermsVersionEntity } from '@Infra/database/typeorm/entities/terms-version.entity';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AffiliateEntity,
      TermsVersionEntity,
      PasswordResetTokenEntity,
      RefreshTokenEntity,
      AffiliateStatusHistoryEntity,
    ]),
  ],
  providers: [
    UserRepository,
    AffiliateRepository,
    TermsVersionRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    AffiliateStatusHistoryRepository,
  ],
  exports: [
    UserRepository,
    AffiliateRepository,
    TermsVersionRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    AffiliateStatusHistoryRepository,
    TypeOrmModule,
  ],
})
export class SharedModule {}

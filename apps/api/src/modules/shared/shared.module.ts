import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AFFILIATE_REPOSITORY } from '@Domain/affiliates/affiliate.repository';
import { AFFILIATE_STATUS_HISTORY_REPOSITORY } from '@Domain/affiliates/affiliate-status-history.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@Domain/auth/password-reset-token.repository';
import { TERMS_VERSION_REPOSITORY } from '@Domain/terms/terms-version.repository';
import { USER_REPOSITORY } from '@Domain/users/user.repository';
import { AffiliateTypeormEntity } from '@Infra/database/typeorm/entities/affiliate.typeorm-entity';
import { AffiliateStatusHistoryTypeormEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.typeorm-entity';
import { PasswordResetTokenTypeormEntity } from '@Infra/database/typeorm/entities/password-reset-token.typeorm-entity';
import { TermsVersionTypeormEntity } from '@Infra/database/typeorm/entities/terms-version.typeorm-entity';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';
import { AffiliateTypeormRepository } from '@Infra/database/typeorm/repositories/affiliate.typeorm-repository';
import { AffiliateStatusHistoryTypeormRepository } from '@Infra/database/typeorm/repositories/affiliate-status-history.typeorm-repository';
import { PasswordResetTokenTypeormRepository } from '@Infra/database/typeorm/repositories/password-reset-token.typeorm-repository';
import { TermsVersionTypeormRepository } from '@Infra/database/typeorm/repositories/terms-version.typeorm-repository';
import { UserTypeormRepository } from '@Infra/database/typeorm/repositories/user.typeorm-repository';

const REPOSITORIES = [
  { provide: USER_REPOSITORY, useClass: UserTypeormRepository },
  { provide: AFFILIATE_REPOSITORY, useClass: AffiliateTypeormRepository },
  { provide: TERMS_VERSION_REPOSITORY, useClass: TermsVersionTypeormRepository },
  { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useClass: PasswordResetTokenTypeormRepository },
  {
    provide: AFFILIATE_STATUS_HISTORY_REPOSITORY,
    useClass: AffiliateStatusHistoryTypeormRepository,
  },
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTypeormEntity,
      AffiliateTypeormEntity,
      TermsVersionTypeormEntity,
      PasswordResetTokenTypeormEntity,
      AffiliateStatusHistoryTypeormEntity,
    ]),
  ],
  providers: REPOSITORIES,
  exports: [...REPOSITORIES.map((repository) => repository.provide), TypeOrmModule],
})
export class SharedModule {}

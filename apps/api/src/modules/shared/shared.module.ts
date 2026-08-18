import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { TermsVersionRepository } from '@Domain/terms/terms-version.repository';
import { UserRepository } from '@Domain/users/user.repository';
import { AffiliateEntity } from '@Infra/database/typeorm/entities/affiliate.entity';
import { TermsVersionEntity } from '@Infra/database/typeorm/entities/terms-version.entity';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, AffiliateEntity, TermsVersionEntity])],
  providers: [UserRepository, AffiliateRepository, TermsVersionRepository],
  exports: [UserRepository, AffiliateRepository, TermsVersionRepository, TypeOrmModule],
})
export class SharedModule {}

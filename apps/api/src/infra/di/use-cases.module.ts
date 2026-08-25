import { FactoryProvider, Module } from '@nestjs/common';
import { ApproveAffiliateUseCase } from '@Application/affiliates/approve-affiliate.use-case';
import { CreateAffiliateUseCase } from '@Application/affiliates/create-affiliate.use-case';
import { GetAffiliateUseCase } from '@Application/affiliates/get-affiliate.use-case';
import { ListAffiliateStatusHistoryUseCase } from '@Application/affiliates/list-affiliate-status-history.use-case';
import { ListAffiliatesUseCase } from '@Application/affiliates/list-affiliates.use-case';
import { RejectAffiliateUseCase } from '@Application/affiliates/reject-affiliate.use-case';
import { AdminLoginUseCase } from '@Application/auth/admin-login.use-case';
import { AFFILIATE_REPOSITORY } from '@Domain/affiliates/affiliate.repository';
import { AFFILIATE_STATUS_HISTORY_REPOSITORY } from '@Domain/affiliates/affiliate-status-history.repository';
import { ACCESS_TOKEN_ISSUER } from '@Domain/auth/access-token';
import { PASSWORD_HASHER } from '@Domain/auth/password-hasher';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@Domain/auth/password-reset-token.repository';
import { TOKEN_GENERATOR } from '@Domain/auth/token-generator';
import { LINK_BUILDER } from '@Domain/notifications/link-builder';
import { MAILER } from '@Domain/notifications/mailer';
import { CLOCK } from '@Domain/shared/clock';
import { Token } from '@Domain/shared/token';
import { USER_REPOSITORY } from '@Domain/users/user.repository';
import { RepositoriesModule } from '@Infra/database/typeorm/repositories/repositories.module';

/**
 * O use case é classe TypeScript pura, e Nest é infraestrutura — por isso o
 * wiring mora aqui, e não ao lado dele. O array é posicional, e o tipo mapeado
 * sobre os parâmetros do construtor é o que faz o compilador cobrar um token
 * para cada um — o certo, na posição certa: token a menos ou token trocado vira
 * erro de type-check, e não dependência `undefined` ou colaborador errado na
 * primeira chamada da rota.
 */
function provideUseCase<TDependencies extends unknown[], TUseCase>(
  useCase: new (...dependencies: TDependencies) => TUseCase,
  inject: { [Position in keyof TDependencies]: Token<TDependencies[Position]> },
): FactoryProvider<TUseCase> {
  return {
    provide: useCase,
    inject,
    useFactory: (...dependencies: TDependencies) => new useCase(...dependencies),
  };
}

const USE_CASES = [
  provideUseCase(CreateAffiliateUseCase, [USER_REPOSITORY, AFFILIATE_REPOSITORY, MAILER]),
  provideUseCase(AdminLoginUseCase, [USER_REPOSITORY, PASSWORD_HASHER, ACCESS_TOKEN_ISSUER, CLOCK]),
  provideUseCase(ListAffiliatesUseCase, [AFFILIATE_REPOSITORY]),
  provideUseCase(GetAffiliateUseCase, [AFFILIATE_REPOSITORY]),
  provideUseCase(ListAffiliateStatusHistoryUseCase, [
    AFFILIATE_REPOSITORY,
    AFFILIATE_STATUS_HISTORY_REPOSITORY,
  ]),
  provideUseCase(ApproveAffiliateUseCase, [
    AFFILIATE_REPOSITORY,
    USER_REPOSITORY,
    PASSWORD_RESET_TOKEN_REPOSITORY,
    TOKEN_GENERATOR,
    LINK_BUILDER,
    MAILER,
    CLOCK,
  ]),
  provideUseCase(RejectAffiliateUseCase, [AFFILIATE_REPOSITORY, USER_REPOSITORY, MAILER]),
];

@Module({
  imports: [RepositoriesModule],
  providers: USE_CASES,
  exports: USE_CASES.map((useCase) => useCase.provide),
})
export class UseCasesModule {}

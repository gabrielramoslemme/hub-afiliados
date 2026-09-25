import { FactoryProvider, Module } from '@nestjs/common';
import { ApproveAffiliateUseCase } from '@Application/affiliates/approve-affiliate.use-case';
import { ChangeEmailUseCase } from '@Application/affiliates/change-email.use-case';
import { ChangeOccupationUseCase } from '@Application/affiliates/change-occupation.use-case';
import { ChangePixKeyUseCase } from '@Application/affiliates/change-pix-key.use-case';
import { CreateAffiliateUseCase } from '@Application/affiliates/create-affiliate.use-case';
import { GetAffiliateUseCase } from '@Application/affiliates/get-affiliate.use-case';
import { GetAffiliateAccountUseCase } from '@Application/affiliates/get-affiliate-account.use-case';
import { ListAffiliateAuditLogsUseCase } from '@Application/affiliates/list-affiliate-audit-logs.use-case';
import { ListAffiliatesUseCase } from '@Application/affiliates/list-affiliates.use-case';
import { RejectAffiliateUseCase } from '@Application/affiliates/reject-affiliate.use-case';
import { AdminLoginUseCase } from '@Application/auth/admin-login.use-case';
import { AffiliateLoginUseCase } from '@Application/auth/affiliate-login.use-case';
import { RequestPasswordResetUseCase } from '@Application/auth/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@Application/auth/reset-password.use-case';
import { SetPasswordUseCase } from '@Application/auth/set-password.use-case';
import { ChangeAffiliateCouponUseCase } from '@Application/coupons/change-affiliate-coupon.use-case';
import { CheckCouponAvailabilityUseCase } from '@Application/coupons/check-coupon-availability.use-case';
import { ApplyIncentiveEventUseCase } from '@Application/sales/apply-incentive-event.use-case';
import { GetAffiliateReferralsUseCase } from '@Application/sales/get-affiliate-referrals.use-case';
import { GetAffiliateWalletUseCase } from '@Application/sales/get-affiliate-wallet.use-case';
import { RecordInvalidIncentiveNotificationUseCase } from '@Application/sales/record-invalid-incentive-notification.use-case';
import { AFFILIATE_REPOSITORY } from '@Domain/affiliates/affiliate.repository';
import { AUDIT_LOG_REPOSITORY } from '@Domain/audit/audit-log.repository';
import { ACCESS_TOKEN_ISSUER } from '@Domain/auth/access-token';
import { PASSWORD_HASHER } from '@Domain/auth/password-hasher';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@Domain/auth/password-reset-token.repository';
import { TOKEN_GENERATOR } from '@Domain/auth/token-generator';
import { COUPON_REPOSITORY } from '@Domain/coupons/coupon.repository';
import { COUPON_GATEWAY } from '@Domain/coupons/coupon-gateway';
import { LINK_BUILDER } from '@Domain/notifications/link-builder';
import { MAILER } from '@Domain/notifications/mailer';
import { INCENTIVE_EVENT_REPOSITORY } from '@Domain/sales/incentive-event.repository';
import { SALE_REPOSITORY } from '@Domain/sales/sale.repository';
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
  provideUseCase(CreateAffiliateUseCase, [USER_REPOSITORY, AFFILIATE_REPOSITORY, MAILER, CLOCK]),
  provideUseCase(AdminLoginUseCase, [USER_REPOSITORY, PASSWORD_HASHER, ACCESS_TOKEN_ISSUER, CLOCK]),
  provideUseCase(ListAffiliatesUseCase, [AFFILIATE_REPOSITORY]),
  provideUseCase(GetAffiliateUseCase, [AFFILIATE_REPOSITORY]),
  provideUseCase(ListAffiliateAuditLogsUseCase, [AFFILIATE_REPOSITORY, AUDIT_LOG_REPOSITORY]),
  provideUseCase(ApproveAffiliateUseCase, [
    AFFILIATE_REPOSITORY,
    USER_REPOSITORY,
    COUPON_REPOSITORY,
    COUPON_GATEWAY,
    PASSWORD_RESET_TOKEN_REPOSITORY,
    TOKEN_GENERATOR,
    LINK_BUILDER,
    MAILER,
    CLOCK,
  ]),
  provideUseCase(CheckCouponAvailabilityUseCase, [COUPON_REPOSITORY, COUPON_GATEWAY]),
  provideUseCase(ChangeAffiliateCouponUseCase, [
    AFFILIATE_REPOSITORY,
    USER_REPOSITORY,
    COUPON_REPOSITORY,
    COUPON_GATEWAY,
  ]),
  provideUseCase(RejectAffiliateUseCase, [AFFILIATE_REPOSITORY, USER_REPOSITORY, MAILER]),
  provideUseCase(AffiliateLoginUseCase, [
    USER_REPOSITORY,
    PASSWORD_HASHER,
    ACCESS_TOKEN_ISSUER,
    CLOCK,
  ]),
  provideUseCase(SetPasswordUseCase, [
    USER_REPOSITORY,
    PASSWORD_RESET_TOKEN_REPOSITORY,
    PASSWORD_HASHER,
    TOKEN_GENERATOR,
    CLOCK,
  ]),
  provideUseCase(RequestPasswordResetUseCase, [
    USER_REPOSITORY,
    PASSWORD_RESET_TOKEN_REPOSITORY,
    TOKEN_GENERATOR,
    LINK_BUILDER,
    MAILER,
    CLOCK,
  ]),
  provideUseCase(ResetPasswordUseCase, [
    USER_REPOSITORY,
    PASSWORD_RESET_TOKEN_REPOSITORY,
    PASSWORD_HASHER,
    TOKEN_GENERATOR,
    CLOCK,
  ]),
  provideUseCase(GetAffiliateAccountUseCase, [USER_REPOSITORY]),
  provideUseCase(ChangePixKeyUseCase, [
    USER_REPOSITORY,
    AFFILIATE_REPOSITORY,
    PASSWORD_HASHER,
    MAILER,
  ]),
  provideUseCase(ChangeEmailUseCase, [USER_REPOSITORY, PASSWORD_HASHER, MAILER]),
  provideUseCase(ChangeOccupationUseCase, [USER_REPOSITORY, AFFILIATE_REPOSITORY]),
  provideUseCase(GetAffiliateReferralsUseCase, [USER_REPOSITORY, SALE_REPOSITORY, CLOCK]),
  provideUseCase(GetAffiliateWalletUseCase, [USER_REPOSITORY, SALE_REPOSITORY, CLOCK]),
  provideUseCase(ApplyIncentiveEventUseCase, [
    COUPON_REPOSITORY,
    SALE_REPOSITORY,
    INCENTIVE_EVENT_REPOSITORY,
    CLOCK,
  ]),
  provideUseCase(RecordInvalidIncentiveNotificationUseCase, [INCENTIVE_EVENT_REPOSITORY, CLOCK]),
];

@Module({
  imports: [RepositoriesModule],
  providers: USE_CASES,
  exports: USE_CASES.map((useCase) => useCase.provide),
})
export class UseCasesModule {}

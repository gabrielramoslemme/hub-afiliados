import {
  AffiliateStatusEnum,
  CouponStatusEnum,
  MailTemplateEnum,
  TokenPurposeEnum,
} from '@porto/contracts';
import {
  AffiliateAlreadyDecidedError,
  AffiliateNotFoundError,
} from '@Domain/affiliates/affiliates.errors';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import {
  CouponCodeUnavailableError,
  CouponProviderUnavailableError,
} from '@Domain/coupons/coupons.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { couponRepositoryMock } from '@Testing/mocks/repositories/coupon.repository.mock';
import { passwordResetTokenRepositoryMock } from '@Testing/mocks/repositories/password-reset-token.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { couponGatewayMock } from '@Testing/mocks/services/coupon-gateway.mock';
import { linkBuilderMock } from '@Testing/mocks/services/link-builder.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { tokenGeneratorMock } from '@Testing/mocks/services/token-generator.mock';
import { ApproveAffiliateUseCase } from './approve-affiliate.use-case';

describe('ApproveAffiliateUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let couponRepository: ReturnType<typeof couponRepositoryMock>;
  let couponGateway: ReturnType<typeof couponGatewayMock>;
  let passwordResetTokenRepository: ReturnType<typeof passwordResetTokenRepositoryMock>;
  let tokenGenerator: ReturnType<typeof tokenGeneratorMock>;
  let linkBuilder: ReturnType<typeof linkBuilderMock>;
  let mailer: ReturnType<typeof mailerMock>;
  let clock: ReturnType<typeof clockMock>;
  let useCase: ApproveAffiliateUseCase;

  const NOW = new Date('2026-08-25T12:00:00.000Z');
  const owner = buildUser({ name: 'Marina Ferraz', email: 'marina@email.com' });
  const affiliate = buildAffiliate({ user: owner });
  const operator = buildAdminUser({ name: 'Analista Porto' });

  function input(overrides: Partial<{ couponCode: string; couponDiscountPercent: number }> = {}) {
    return {
      publicId: affiliate.publicId,
      actorPublicId: operator.publicId,
      couponCode: 'MARINA25',
      couponDiscountPercent: 10,
      ...overrides,
    };
  }

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    userRepository = userRepositoryMock();
    couponRepository = couponRepositoryMock();
    couponGateway = couponGatewayMock();
    passwordResetTokenRepository = passwordResetTokenRepositoryMock();
    tokenGenerator = tokenGeneratorMock();
    linkBuilder = linkBuilderMock();
    mailer = mailerMock();
    clock = clockMock(NOW);
    useCase = new ApproveAffiliateUseCase(
      affiliateRepository,
      userRepository,
      couponRepository,
      couponGateway,
      passwordResetTokenRepository,
      tokenGenerator,
      linkBuilder,
      mailer,
      clock,
    );

    affiliateRepository.findByPublicId.mockResolvedValue({
      ...affiliate,
      approvedBy: null,
      coupon: null,
    });
    affiliateRepository.changeStatus.mockResolvedValue({
      ...affiliate,
      status: AffiliateStatusEnum.APPROVED,
    });
    userRepository.findByPublicId.mockResolvedValue({ ...operator, affiliate: null });
  });

  it('approves a pending registration and stamps who decided', async () => {
    await useCase.execute(input());

    expect(affiliateRepository.changeStatus).toHaveBeenCalledWith({
      affiliateId: affiliate.id,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: operator.id,
      changes: {
        approvedAt: NOW,
        approvedByUserId: operator.id,
        rejectionReason: null,
      },
      coupon: {
        code: 'MARINA25',
        discountPercent: 10,
        status: CouponStatusEnum.ACTIVE,
      },
    });
  });

  /* O cupom é nosso: o que se grava é o que a analista escolheu, e a Porto só o registra. */
  it('issues and records the coupon the analyst chose, normalized', async () => {
    await useCase.execute(input({ couponCode: ' marina25 ', couponDiscountPercent: 15 }));

    expect(couponGateway.issue).toHaveBeenCalledWith({ code: 'MARINA25', discountPercent: 15 });
    expect(affiliateRepository.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        coupon: { code: 'MARINA25', discountPercent: 15, status: CouponStatusEnum.ACTIVE },
      }),
    );
  });

  /*
    A ordem é a regra: o cupom nasce lá antes de qualquer escrita aqui. É o que
    faz "a Porto não respondeu" deixar o cadastro exatamente como estava.
  */
  it('leaves the registration pending when the provider is unavailable', async () => {
    couponGateway.issue.mockRejectedValue(new CouponProviderUnavailableError());

    await expect(useCase.execute(input())).rejects.toThrow(CouponProviderUnavailableError);
    expect(affiliateRepository.changeStatus).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('refuses a coupon code already issued to another affiliate', async () => {
    couponRepository.findByCode.mockResolvedValue(buildCoupon({ code: 'MARINA25' }));

    await expect(useCase.execute(input())).rejects.toThrow(CouponCodeUnavailableError);
    expect(couponGateway.issue).not.toHaveBeenCalled();
    expect(affiliateRepository.changeStatus).not.toHaveBeenCalled();
  });

  it('refuses a coupon code the provider reports as taken', async () => {
    couponGateway.issue.mockRejectedValue(new CouponCodeUnavailableError());

    await expect(useCase.execute(input())).rejects.toThrow(CouponCodeUnavailableError);
    expect(affiliateRepository.changeStatus).not.toHaveBeenCalled();
  });

  it('refuses a registration that was already decided', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue({
      ...buildAffiliate({ status: AffiliateStatusEnum.APPROVED }),
      approvedBy: null,
      coupon: null,
    });

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateAlreadyDecidedError);
    expect(couponGateway.issue).not.toHaveBeenCalled();
  });

  it('reports an affiliate that does not exist', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateNotFoundError);
  });

  it('refuses a token of an operator that is gone', async () => {
    userRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(UnknownOperatorError);
    expect(couponGateway.issue).not.toHaveBeenCalled();
  });

  it('stores only the hash of the set-password token, valid for 48 hours', async () => {
    await useCase.execute(input());

    expect(passwordResetTokenRepository.invalidateAllFor).toHaveBeenCalledWith(
      affiliate.userId,
      TokenPurposeEnum.SET_PASSWORD,
    );
    expect(passwordResetTokenRepository.create).toHaveBeenCalledWith({
      userId: affiliate.userId,
      tokenHash: 'hashed-token',
      purpose: TokenPurposeEnum.SET_PASSWORD,
      expiresAt: new Date('2026-08-27T12:00:00.000Z'),
    });
  });

  it('sends the approval email with the link in the clear and the coupon', async () => {
    await useCase.execute(input());

    expect(linkBuilder.setPasswordLink).toHaveBeenCalledWith('plain-token');
    expect(mailer.send).toHaveBeenCalledWith({
      template: MailTemplateEnum.REGISTRATION_APPROVED,
      to: 'marina@email.com',
      toName: 'Marina Ferraz',
      variables: {
        name: 'Marina',
        link: 'https://afiliados.porto.example/definir-senha?token=plain-token',
        coupon: 'MARINA25',
        discountPercent: '10',
      },
    });
  });

  /*
    Duas analistas aprovando o mesmo cadastro passam juntas pela checagem do
    começo e emitem, cada uma, o seu cupom. O lock decide quem grava; quem perde
    não pode deixar para trás um cupom valendo no checkout sem dono.
  */
  it('refuses and withdraws the coupon when another decision got there first', async () => {
    affiliateRepository.changeStatus.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateAlreadyDecidedError);
    expect(couponGateway.change).toHaveBeenCalledWith({
      code: 'MARINA25',
      status: CouponStatusEnum.INACTIVE,
    });
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('withdraws the coupon when the approval cannot be written', async () => {
    const failure = new Error('connection terminated');
    affiliateRepository.changeStatus.mockRejectedValue(failure);

    await expect(useCase.execute(input())).rejects.toBe(failure);
    expect(couponGateway.change).toHaveBeenCalledWith({
      code: 'MARINA25',
      status: CouponStatusEnum.INACTIVE,
    });
  });

  it('keeps the original failure when withdrawing the coupon fails too', async () => {
    affiliateRepository.changeStatus.mockResolvedValue(null);
    couponGateway.change.mockRejectedValue(new CouponProviderUnavailableError());

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateAlreadyDecidedError);
  });

  /*
    Um código só existe uma vez na Porto. Se outra aprovação gravou o mesmo
    código primeiro, o cupom registrado lá é dela: desativá-lo tiraria do
    checkout o desconto de quem ganhou a corrida.
  */
  it('leaves alone a coupon that another approval recorded first', async () => {
    affiliateRepository.changeStatus.mockResolvedValue(null);
    couponRepository.findByCode
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildCoupon({ code: 'MARINA25' }));

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateAlreadyDecidedError);
    expect(couponGateway.change).not.toHaveBeenCalled();
  });

  it('leaves alone a coupon whose code another affiliate recorded first', async () => {
    affiliateRepository.changeStatus.mockRejectedValue(new CouponCodeUnavailableError());
    couponRepository.findByCode
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildCoupon({ code: 'MARINA25' }));

    await expect(useCase.execute(input())).rejects.toThrow(CouponCodeUnavailableError);
    expect(couponGateway.change).not.toHaveBeenCalled();
  });

  /* Banco fora do ar é o caso comum: sem saber de quem é o cupom, ele não pode ficar ativo sem dono. */
  it('withdraws the coupon when its owner cannot be checked either', async () => {
    const failure = new Error('connection terminated');
    affiliateRepository.changeStatus.mockRejectedValue(failure);
    couponRepository.findByCode.mockResolvedValueOnce(null).mockRejectedValueOnce(failure);

    await expect(useCase.execute(input())).rejects.toBe(failure);
    expect(couponGateway.change).toHaveBeenCalledWith({
      code: 'MARINA25',
      status: CouponStatusEnum.INACTIVE,
    });
  });

  it('leaves the coupon alone when the approval is written', async () => {
    await useCase.execute(input());

    expect(couponGateway.change).not.toHaveBeenCalled();
  });
});

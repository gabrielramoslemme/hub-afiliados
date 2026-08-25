import { AffiliateStatusEnum, MailTemplateEnum, TokenPurposeEnum } from '@porto/contracts';
import {
  AffiliateAlreadyDecidedError,
  AffiliateNotFoundError,
} from '@Domain/affiliates/affiliates.errors';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { passwordResetTokenRepositoryMock } from '@Testing/mocks/repositories/password-reset-token.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { linkBuilderMock } from '@Testing/mocks/services/link-builder.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { tokenGeneratorMock } from '@Testing/mocks/services/token-generator.mock';
import { ApproveAffiliateUseCase } from './approve-affiliate.use-case';

describe('ApproveAffiliateUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordResetTokenRepository: ReturnType<typeof passwordResetTokenRepositoryMock>;
  let tokenGenerator: ReturnType<typeof tokenGeneratorMock>;
  let linkBuilder: ReturnType<typeof linkBuilderMock>;
  let mailer: ReturnType<typeof mailerMock>;
  let clock: ReturnType<typeof clockMock>;
  let useCase: ApproveAffiliateUseCase;

  const owner = buildUser({ name: 'Marina Ferraz', email: 'marina@email.com' });
  const affiliate = buildAffiliate({ user: owner });
  const operator = buildAdminUser({ name: 'Analista Porto' });

  function input() {
    return { publicId: affiliate.publicId, actorPublicId: operator.publicId };
  }

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    userRepository = userRepositoryMock();
    passwordResetTokenRepository = passwordResetTokenRepositoryMock();
    tokenGenerator = tokenGeneratorMock();
    linkBuilder = linkBuilderMock();
    mailer = mailerMock();
    clock = clockMock();
    useCase = new ApproveAffiliateUseCase(
      affiliateRepository,
      userRepository,
      passwordResetTokenRepository,
      tokenGenerator,
      linkBuilder,
      mailer,
      clock,
    );

    affiliateRepository.findByPublicId.mockResolvedValue({ ...affiliate, approvedBy: null });
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
      toStatus: AffiliateStatusEnum.APPROVED,
      actorUserId: operator.id,
      changes: {
        approvedAt: new Date('2026-08-25T12:00:00.000Z'),
        approvedByUserId: operator.id,
        rejectionReason: null,
      },
    });
  });

  it('refuses a registration that was already decided', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue({
      ...buildAffiliate({ status: AffiliateStatusEnum.APPROVED }),
      approvedBy: null,
    });

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateAlreadyDecidedError);
    expect(affiliateRepository.changeStatus).not.toHaveBeenCalled();
  });

  it('reports an affiliate that does not exist', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateNotFoundError);
  });

  it('refuses a token of an operator that is gone', async () => {
    userRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(UnknownOperatorError);
    expect(affiliateRepository.changeStatus).not.toHaveBeenCalled();
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

  it('sends the approval email with the link in the clear', async () => {
    await useCase.execute(input());

    expect(linkBuilder.setPasswordLink).toHaveBeenCalledWith('plain-token');
    expect(mailer.send).toHaveBeenCalledWith({
      template: MailTemplateEnum.REGISTRATION_APPROVED,
      to: 'marina@email.com',
      toName: 'Marina Ferraz',
      variables: {
        name: 'Marina',
        link: 'https://afiliados.porto.example/definir-senha?token=plain-token',
      },
    });
  });

  it('reports an affiliate that vanished between the read and the write', async () => {
    affiliateRepository.changeStatus.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateNotFoundError);
    expect(mailer.send).not.toHaveBeenCalled();
  });
});

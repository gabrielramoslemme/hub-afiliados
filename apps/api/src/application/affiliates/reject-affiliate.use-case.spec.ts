import { AffiliateStatusEnum, MailTemplateEnum } from '@porto/contracts';
import {
  AffiliateAlreadyDecidedError,
  AffiliateNotFoundError,
} from '@Domain/affiliates/affiliates.errors';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { RejectAffiliateUseCase } from './reject-affiliate.use-case';

describe('RejectAffiliateUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let mailer: ReturnType<typeof mailerMock>;
  let useCase: RejectAffiliateUseCase;

  const owner = buildUser({ name: 'Marina Ferraz', email: 'marina@email.com' });
  const affiliate = buildAffiliate({ user: owner });
  const operator = buildAdminUser({ name: 'Analista Porto' });
  const reason = 'CPF divergente do titular da chave PIX';

  function input() {
    return { publicId: affiliate.publicId, actorPublicId: operator.publicId, reason };
  }

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    userRepository = userRepositoryMock();
    mailer = mailerMock();
    useCase = new RejectAffiliateUseCase(affiliateRepository, userRepository, mailer);

    affiliateRepository.findByPublicId.mockResolvedValue({ ...affiliate, approvedBy: null });
    affiliateRepository.changeStatus.mockResolvedValue({
      ...affiliate,
      status: AffiliateStatusEnum.REJECTED,
    });
    userRepository.findByPublicId.mockResolvedValue({ ...operator, affiliate: null });
  });

  it('records the reason on the affiliate and on the trail', async () => {
    await useCase.execute(input());

    expect(affiliateRepository.changeStatus).toHaveBeenCalledWith({
      affiliateId: affiliate.id,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.REJECTED,
      reason,
      actorUserId: operator.id,
      changes: { rejectionReason: reason },
    });
  });

  it('refuses a registration that was already decided', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue({
      ...buildAffiliate({ status: AffiliateStatusEnum.REJECTED }),
      approvedBy: null,
    });

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateAlreadyDecidedError);
    expect(affiliateRepository.changeStatus).not.toHaveBeenCalled();
  });

  /* A checagem do começo não segura a linha: quem decide a corrida é o lock. */
  it('refuses when another decision got there first', async () => {
    affiliateRepository.changeStatus.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateAlreadyDecidedError);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('reports an affiliate that does not exist', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(AffiliateNotFoundError);
  });

  it('refuses a token of an operator that is gone', async () => {
    userRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input())).rejects.toThrow(UnknownOperatorError);
  });

  it('sends the rejection email carrying the reason', async () => {
    await useCase.execute(input());

    expect(mailer.send).toHaveBeenCalledWith({
      template: MailTemplateEnum.REGISTRATION_REJECTED,
      to: 'marina@email.com',
      toName: 'Marina Ferraz',
      variables: { name: 'Marina', reason },
    });
  });
});

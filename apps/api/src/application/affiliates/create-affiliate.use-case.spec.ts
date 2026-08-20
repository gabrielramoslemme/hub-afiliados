import { AffiliateStatusEnum, MailTemplateEnum, PixKeyTypeEnum } from '@porto/contracts';
import {
  CpfAlreadyRegisteredError,
  EmailAlreadyRegisteredError,
  InvalidCpfError,
  InvalidPixKeyError,
  OutdatedTermsError,
  PixKeyMismatchError,
  TermsNotAcceptedError,
} from '@Domain/affiliates/affiliates.errors';
import { TermsVersionEntity } from '@Domain/terms/terms-version.entity';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { termsVersionRepositoryMock } from '@Testing/mocks/repositories/terms-version.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { CreateAffiliateInput, CreateAffiliateUseCase } from './create-affiliate.use-case';

describe('CreateAffiliateUseCase', () => {
  const input: CreateAffiliateInput = {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '529.982.247-25',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: 'marina@email.com',
    termsVersion: '1.0-homolog',
    termsAccepted: true,
  };

  const currentTerms: TermsVersionEntity = {
    id: 1,
    version: '1.0-homolog',
    contentUrl: 'https://example.com/termos/1.0',
    publishedAt: new Date('2026-08-17T12:00:00Z'),
    isCurrent: true,
    createdAt: new Date('2026-08-17T12:00:00Z'),
  };

  function buildUseCase() {
    const userRepository = userRepositoryMock();
    const affiliateRepository = affiliateRepositoryMock();
    const termsVersionRepository = termsVersionRepositoryMock();
    const mailer = mailerMock();
    termsVersionRepository.findCurrent.mockResolvedValue(currentTerms);
    affiliateRepository.createWithUser.mockResolvedValue(
      buildAffiliate({ publicId: 'affiliate-public-id' }),
    );
    const useCase = new CreateAffiliateUseCase(
      userRepository,
      affiliateRepository,
      termsVersionRepository,
      mailer,
    );
    return { useCase, userRepository, affiliateRepository, termsVersionRepository, mailer };
  }

  it('creates the affiliate pending approval', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute(input)).resolves.toEqual({
      publicId: 'affiliate-public-id',
      status: AffiliateStatusEnum.PENDING_APPROVAL,
    });
  });

  it('creates the user without a password', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute(input);

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.not.objectContaining({ password: expect.anything() }),
    );
  });

  it('stores the cpf with digits only', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute(input);

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({ cpf: '52998224725' }),
    );
  });

  it('stores the termsVersionRepository version that is current', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute(input);

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({ termsVersionId: 1, termsAcceptedAt: expect.any(Date) }),
    );
  });

  it('sends the registration received email', async () => {
    const { useCase, mailer } = buildUseCase();

    await useCase.execute(input);

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        template: MailTemplateEnum.REGISTRATION_RECEIVED,
        to: 'marina@email.com',
      }),
    );
  });

  it('rejects a registration without the termsVersionRepository acceptance', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...input, termsAccepted: false })).rejects.toThrow(
      TermsNotAcceptedError,
    );
  });

  it('rejects a cpf with an invalid check digit', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...input, cpf: '529.982.247-26' })).rejects.toThrow(
      InvalidCpfError,
    );
  });

  it('rejects a termsVersionRepository version that is no longer current', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...input, termsVersion: '0.9-homolog' })).rejects.toThrow(
      OutdatedTermsError,
    );
  });

  it('rejects a registration when no termsVersionRepository version is published', async () => {
    const { useCase, termsVersionRepository } = buildUseCase();
    termsVersionRepository.findCurrent.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(OutdatedTermsError);
  });

  it('rejects a pix key of type cpf that differs from the informed cpf', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        ...input,
        pixKeyType: PixKeyTypeEnum.CPF,
        pixKey: '111.444.777-35',
      }),
    ).rejects.toThrow(PixKeyMismatchError);
  });

  it('accepts a pix key of type cpf equal to the informed cpf', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute({ ...input, pixKeyType: PixKeyTypeEnum.CPF, pixKey: '529.982.247-25' });

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({ pixKey: '52998224725' }),
    );
  });

  it('rejects a malformed pix key', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({ ...input, pixKeyType: PixKeyTypeEnum.EMAIL, pixKey: 'not-an-email' }),
    ).rejects.toThrow(InvalidPixKeyError);
  });

  it('rejects an email already registered', async () => {
    const { useCase, userRepository } = buildUseCase();
    userRepository.findByEmail.mockResolvedValue({ ...buildAffiliate().user, affiliate: null });

    await expect(useCase.execute(input)).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('rejects a cpf already registered', async () => {
    const { useCase, affiliateRepository } = buildUseCase();
    affiliateRepository.findByCpf.mockResolvedValue(buildAffiliate());

    await expect(useCase.execute(input)).rejects.toThrow(CpfAlreadyRegisteredError);
  });

  it('does not send the email when the registration fails', async () => {
    const { useCase, affiliateRepository, mailer } = buildUseCase();
    affiliateRepository.findByCpf.mockResolvedValue(buildAffiliate());

    await expect(useCase.execute(input)).rejects.toThrow(CpfAlreadyRegisteredError);
    expect(mailer.send).not.toHaveBeenCalled();
  });
});

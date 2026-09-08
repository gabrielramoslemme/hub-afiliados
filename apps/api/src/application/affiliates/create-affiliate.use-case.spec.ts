import {
  AffiliateStatusEnum,
  MailTemplateEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import {
  CpfAlreadyRegisteredError,
  EmailAlreadyRegisteredError,
  InvalidCpfError,
  InvalidPixKeyError,
  InvalidRgError,
  PixKeyMismatchError,
  RgAlreadyRegisteredError,
  TermsNotAcceptedError,
} from '@Domain/affiliates/affiliates.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { CreateAffiliateInput, CreateAffiliateUseCase } from './create-affiliate.use-case';

describe('CreateAffiliateUseCase', () => {
  const input: CreateAffiliateInput = {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '529.982.247-25',
    rg: '12.345.678-X',
    pixKeyType: PixKeyTypeEnum.EMAIL,
    pixKey: 'marina@email.com',
    socialNetwork: null,
    socialHandle: null,
    termsAccepted: true,
  };

  const acceptedAt = new Date('2026-09-04T12:00:00.000Z');

  function buildUseCase() {
    const userRepository = userRepositoryMock();
    const affiliateRepository = affiliateRepositoryMock();
    const mailer = mailerMock();
    const clock = clockMock(acceptedAt);
    affiliateRepository.createWithUser.mockResolvedValue(
      buildAffiliate({ publicId: 'affiliate-public-id' }),
    );
    const useCase = new CreateAffiliateUseCase(userRepository, affiliateRepository, mailer, clock);
    return { useCase, userRepository, affiliateRepository, mailer, clock };
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

  it('rejects a cpf with an invalid check digit', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...input, cpf: '529.982.247-26' })).rejects.toThrow(
      InvalidCpfError,
    );
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

  it('stores the rg without punctuation and uppercased', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute({ ...input, rg: '12.345.678-x' });

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({ rg: '12345678X' }),
    );
  });

  it('rejects a malformed rg', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...input, rg: '1234' })).rejects.toThrow(InvalidRgError);
  });

  it('rejects an rg already registered', async () => {
    const { useCase, affiliateRepository } = buildUseCase();
    affiliateRepository.findByRg.mockResolvedValue(buildAffiliate());

    await expect(useCase.execute(input)).rejects.toThrow(RgAlreadyRegisteredError);
  });

  it('looks the rg up already normalized', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute({ ...input, rg: '12.345.678-x' });

    expect(affiliateRepository.findByRg).toHaveBeenCalledWith('12345678X');
  });

  it('stores the social handle without the at', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute({
      ...input,
      socialNetwork: SocialNetworkEnum.INSTAGRAM,
      socialHandle: '@marina.ferraz',
    });

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({
        socialNetwork: SocialNetworkEnum.INSTAGRAM,
        socialHandle: 'marina.ferraz',
      }),
    );
  });

  it('stores no social profile when the person informed none', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute(input);

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({ socialNetwork: null, socialHandle: null }),
    );
  });

  it('drops a handle that came without its network', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute({ ...input, socialNetwork: null, socialHandle: '@marinaferraz' });

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({ socialNetwork: null, socialHandle: null }),
    );
  });

  it('drops a social network that arrived as a blank string', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute({ ...input, socialNetwork: '' as unknown as SocialNetworkEnum });

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({ socialNetwork: null, socialHandle: null }),
    );
  });

  it('does not send the email when the rg is already registered', async () => {
    const { useCase, affiliateRepository, mailer } = buildUseCase();
    affiliateRepository.findByRg.mockResolvedValue(buildAffiliate());

    await expect(useCase.execute(input)).rejects.toThrow(RgAlreadyRegisteredError);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('rejects a registration sent without accepting the terms', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...input, termsAccepted: false })).rejects.toThrow(
      TermsNotAcceptedError,
    );
  });

  it('does not create the affiliate when the terms were not accepted', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await expect(useCase.execute({ ...input, termsAccepted: false })).rejects.toThrow(
      TermsNotAcceptedError,
    );
    expect(affiliateRepository.createWithUser).not.toHaveBeenCalled();
  });

  it('records when the terms were accepted', async () => {
    const { useCase, affiliateRepository } = buildUseCase();

    await useCase.execute(input);

    expect(affiliateRepository.createWithUser).toHaveBeenCalledWith(
      expect.objectContaining({ termsAcceptedAt: acceptedAt }),
    );
  });
});

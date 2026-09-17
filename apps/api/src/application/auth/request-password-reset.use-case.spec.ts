import {
  AffiliateStatusEnum,
  AuthAudienceEnum,
  MailTemplateEnum,
  TokenPurposeEnum,
  UserRoleEnum,
} from '@porto/contracts';
import { UserEntity, UserWithAffiliate } from '@Domain/users/user.entity';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { passwordResetTokenRepositoryMock } from '@Testing/mocks/repositories/password-reset-token.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { linkBuilderMock } from '@Testing/mocks/services/link-builder.mock';
import { mailerMock } from '@Testing/mocks/services/mailer.mock';
import { tokenGeneratorMock } from '@Testing/mocks/services/token-generator.mock';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';

const NOW = new Date('2026-08-25T12:00:00.000Z');

function minutesBefore(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

function approvedAffiliate(overrides: Partial<UserEntity> = {}): UserWithAffiliate {
  const user = buildUser({ name: 'Marina Ferraz', email: 'marina@email.com', ...overrides });

  return {
    ...user,
    affiliate: buildAffiliate({ status: AffiliateStatusEnum.APPROVED, user }),
  };
}

function operator(overrides: Partial<UserEntity> = {}): UserWithAffiliate {
  return {
    ...buildAdminUser({ name: 'Ana Souza', email: 'ana@porto.example', ...overrides }),
    affiliate: null,
  };
}

describe('RequestPasswordResetUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let passwordResetTokenRepository: ReturnType<typeof passwordResetTokenRepositoryMock>;
  let tokenGenerator: ReturnType<typeof tokenGeneratorMock>;
  let linkBuilder: ReturnType<typeof linkBuilderMock>;
  let mailer: ReturnType<typeof mailerMock>;
  let useCase: RequestPasswordResetUseCase;

  beforeEach(() => {
    userRepository = userRepositoryMock();
    passwordResetTokenRepository = passwordResetTokenRepositoryMock();
    tokenGenerator = tokenGeneratorMock();
    linkBuilder = linkBuilderMock();
    mailer = mailerMock();
    useCase = new RequestPasswordResetUseCase(
      userRepository,
      passwordResetTokenRepository,
      tokenGenerator,
      linkBuilder,
      mailer,
      clockMock(NOW),
    );
  });

  // O link leva de volta à tela de quem pediu: o operador não redefine a senha no portal.
  it.each([
    [AuthAudienceEnum.AFFILIATE, approvedAffiliate],
    [AuthAudienceEnum.ADMIN, operator],
  ])('points the link at the %s channel that asked', async (audience, account) => {
    const user = account();
    userRepository.findByEmail.mockResolvedValue(user);

    await useCase.execute({ email: user.email, audience });

    expect(linkBuilder.resetPasswordLink).toHaveBeenCalledWith('plain-token', audience);
  });

  describe('affiliate channel', () => {
    const input = { email: 'marina@email.com', audience: AuthAudienceEnum.AFFILIATE };

    it('mails the recovery link to an approved affiliate', async () => {
      const user = approvedAffiliate();
      userRepository.findByEmail.mockResolvedValue(user);

      await useCase.execute(input);

      expect(mailer.send).toHaveBeenCalledWith({
        template: MailTemplateEnum.PASSWORD_RECOVERY,
        to: 'marina@email.com',
        toName: 'Marina Ferraz',
        variables: {
          name: 'Marina',
          link: 'https://afiliados.porto.example/redefinir-senha?token=plain-token',
        },
      });
    });

    it('stores only the hash of the token, valid for two hours', async () => {
      const user = approvedAffiliate();
      userRepository.findByEmail.mockResolvedValue(user);

      await useCase.execute(input);

      expect(passwordResetTokenRepository.create).toHaveBeenCalledWith({
        userId: user.id,
        tokenHash: 'hashed-token',
        purpose: TokenPurposeEnum.RESET_PASSWORD,
        expiresAt: new Date('2026-08-25T14:00:00.000Z'),
      });
    });

    it('kills the previous links, so only the newest one works', async () => {
      const user = approvedAffiliate();
      userRepository.findByEmail.mockResolvedValue(user);

      await useCase.execute(input);

      expect(passwordResetTokenRepository.invalidateAllFor).toHaveBeenCalledWith(
        user.id,
        TokenPurposeEnum.RESET_PASSWORD,
      );
    });

    it('serves an approved affiliate who never set a password', async () => {
      userRepository.findByEmail.mockResolvedValue(approvedAffiliate({ password: null }));

      await useCase.execute(input);

      expect(mailer.send).toHaveBeenCalled();
    });

    it('stays silent for an email nobody registered', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(useCase.execute(input)).resolves.toBeUndefined();
      expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
      expect(mailer.send).not.toHaveBeenCalled();
    });

    // Em análise ou reprovado não entra nem com senha: o link não levaria a lugar nenhum.
    it.each([AffiliateStatusEnum.PENDING_APPROVAL, AffiliateStatusEnum.REJECTED])(
      'stays silent for a registration %s',
      async (status) => {
        const user = buildUser({ email: 'marina@email.com' });
        userRepository.findByEmail.mockResolvedValue({
          ...user,
          affiliate: buildAffiliate({ status, user }),
        });

        await useCase.execute(input);

        expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
        expect(mailer.send).not.toHaveBeenCalled();
      },
    );

    it('stays silent for an inactive account', async () => {
      userRepository.findByEmail.mockResolvedValue(approvedAffiliate({ isActive: false }));

      await useCase.execute(input);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('stays silent when an operator asks on the affiliate channel', async () => {
      userRepository.findByEmail.mockResolvedValue(operator());

      await useCase.execute(input);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    /*
      O limite existe para o pedido não virar uma forma de encher a caixa de
      entrada de quem tem conta. Recusar é ficar em silêncio: responder
      diferente contaria que aquele e-mail existe.
    */
    it('refuses a second link within a minute', async () => {
      userRepository.findByEmail.mockResolvedValue(approvedAffiliate());
      passwordResetTokenRepository.listCreatedSince.mockResolvedValue([minutesBefore(0.5)]);

      await useCase.execute(input);

      expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('refuses the sixth link of the hour', async () => {
      userRepository.findByEmail.mockResolvedValue(approvedAffiliate());
      passwordResetTokenRepository.listCreatedSince.mockResolvedValue([
        minutesBefore(50),
        minutesBefore(40),
        minutesBefore(30),
        minutesBefore(20),
        minutesBefore(10),
      ]);

      await useCase.execute(input);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('counts only the last hour', async () => {
      const user = approvedAffiliate();
      userRepository.findByEmail.mockResolvedValue(user);

      await useCase.execute(input);

      expect(passwordResetTokenRepository.listCreatedSince).toHaveBeenCalledWith(
        user.id,
        TokenPurposeEnum.RESET_PASSWORD,
        new Date('2026-08-25T11:00:00.000Z'),
      );
    });

    it('sends again once the previous link is old enough', async () => {
      userRepository.findByEmail.mockResolvedValue(approvedAffiliate());
      passwordResetTokenRepository.listCreatedSince.mockResolvedValue([minutesBefore(5)]);

      await useCase.execute(input);

      expect(mailer.send).toHaveBeenCalled();
    });
  });

  describe('admin channel', () => {
    const input = { email: 'ana@porto.example', audience: AuthAudienceEnum.ADMIN };

    it('stays silent when an affiliate asks on the panel channel', async () => {
      userRepository.findByEmail.mockResolvedValue(approvedAffiliate());

      await useCase.execute(input);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('stays silent for an operator left without a role', async () => {
      userRepository.findByEmail.mockResolvedValue(operator({ role: null }));

      await useCase.execute(input);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('serves every operator role', async () => {
      userRepository.findByEmail.mockResolvedValue(operator({ role: UserRoleEnum.MESA_ADMIN }));

      await useCase.execute(input);

      expect(mailer.send).toHaveBeenCalled();
    });
  });
});

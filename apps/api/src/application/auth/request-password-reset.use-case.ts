import {
  AffiliateStatusEnum,
  AuthAudienceEnum,
  MailTemplateEnum,
  TokenPurposeEnum,
} from '@porto/contracts';
import { USER_TYPE_BY_AUDIENCE } from '@Domain/auth/audience';
import { PasswordResetTokenRepository } from '@Domain/auth/password-reset-token.repository';
import { TokenGenerator } from '@Domain/auth/token-generator';
import { LinkBuilder } from '@Domain/notifications/link-builder';
import { Mailer } from '@Domain/notifications/mailer';
import { Clock } from '@Domain/shared/clock';
import { UserWithAffiliate } from '@Domain/users/user.entity';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface RequestPasswordResetInput {
  email: string;
  audience: AuthAudienceEnum;
}

/** Curto de propósito: o link é a credencial de quem perdeu a senha. */
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_WINDOW_LIMIT = 5;
const COOLDOWN_MS = 60 * 1000;

/**
 * Quem, em cada canal, tem conta para onde voltar. O afiliado em análise ou
 * reprovado não entra nem com senha, então recuperá-la não o levaria a lugar
 * nenhum; o operador precisa de perfil, que é o que o painel autoriza.
 *
 * Fora daqui o tipo do usuário já foi conferido contra a audiência: o operador
 * que pede na tela do afiliado não recebe link, e o contrário também não.
 */
const ELIGIBLE: Record<AuthAudienceEnum, (user: UserWithAffiliate) => boolean> = {
  [AuthAudienceEnum.AFFILIATE]: (user) => user.affiliate?.status === AffiliateStatusEnum.APPROVED,
  [AuthAudienceEnum.ADMIN]: (user) => Boolean(user.role),
};

/**
 * O pedido de recuperação. **Sempre resolve**, exista ou não a conta: responder
 * diferente transformaria a tela num oráculo de quem participa do programa — e
 * a base de afiliados da Porto é informação de negócio.
 *
 * Pelo mesmo motivo, recusar por excesso de pedidos também é ficar em silêncio.
 */
export class RequestPasswordResetUseCase implements UseCase<RequestPasswordResetInput, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly linkBuilder: LinkBuilder,
    private readonly mailer: Mailer,
    private readonly clock: Clock,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || !this.mayReceiveLink(user, input.audience)) return;

    const now = this.clock.now();

    if (await this.askedTooRecently(user.id, now)) return;

    const { token, hash } = this.tokenGenerator.generate();

    // Um pedido novo mata os anteriores: dois links válidos ao mesmo tempo são
    // superfície de ataque, e quem pediu de novo está com o último na mão.
    await this.passwordResetTokenRepository.invalidateAllFor(
      user.id,
      TokenPurposeEnum.RESET_PASSWORD,
    );
    await this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: hash,
      purpose: TokenPurposeEnum.RESET_PASSWORD,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
    });

    await this.mailer.send({
      template: MailTemplateEnum.PASSWORD_RECOVERY,
      to: user.email,
      toName: user.name,
      variables: {
        name: user.name.split(' ')[0],
        link: this.linkBuilder.resetPasswordLink(token, input.audience),
      },
    });
  }

  private mayReceiveLink(user: UserWithAffiliate, audience: AuthAudienceEnum): boolean {
    return (
      user.isActive && user.type === USER_TYPE_BY_AUDIENCE[audience] && ELIGIBLE[audience](user)
    );
  }

  /**
   * O limite é por conta, e não por quem pediu: a API recebe todo pedido do
   * servidor do Next, então o endereço de quem digitou não chega aqui. O que
   * isto protege é a caixa de entrada de quem tem conta — barrar por origem é
   * trabalho da borda.
   */
  private async askedTooRecently(userId: number, now: Date): Promise<boolean> {
    const issued = await this.passwordResetTokenRepository.listCreatedSince(
      userId,
      TokenPurposeEnum.RESET_PASSWORD,
      new Date(now.getTime() - RATE_WINDOW_MS),
    );

    return (
      issued.length >= RATE_WINDOW_LIMIT ||
      issued.some((instant) => instant.getTime() > now.getTime() - COOLDOWN_MS)
    );
  }
}

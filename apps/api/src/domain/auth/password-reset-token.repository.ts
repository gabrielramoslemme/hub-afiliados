import { TokenPurposeEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';
import {
  PasswordResetTokenEntity,
  PasswordResetTokenWithUser,
} from './password-reset-token.entity';

export const PASSWORD_RESET_TOKEN_REPOSITORY = createToken<PasswordResetTokenRepository>(
  'PASSWORD_RESET_TOKEN_REPOSITORY',
);

export interface CreateTokenInput {
  userId: number;
  tokenHash: string;
  purpose: TokenPurposeEnum;
  expiresAt: Date;
}

export interface PasswordResetTokenRepository {
  create(input: CreateTokenInput): Promise<PasswordResetTokenEntity>;
  findUsable(
    tokenHash: string,
    purpose: TokenPurposeEnum,
  ): Promise<PasswordResetTokenWithUser | null>;
  markUsed(id: number): Promise<void>;
  /** Um pedido novo invalida os anteriores — dois links válidos ao mesmo tempo são superfície de ataque. */
  invalidateAllFor(userId: number, purpose: TokenPurposeEnum): Promise<void>;
  /**
   * Quando cada token daquele propósito foi emitido, de `since` para cá — usado
   * e invalidado incluídos, porque quem limita o ritmo do pedido conta o que já
   * saiu por e-mail, não o que ainda serve. A ordem não é promessa do contrato.
   */
  listCreatedSince(userId: number, purpose: TokenPurposeEnum, since: Date): Promise<Date[]>;
  deleteExpired(): Promise<void>;
}

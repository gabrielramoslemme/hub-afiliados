import { TokenPurposeEnum } from '@porto/contracts';
import {
  PasswordResetTokenEntity,
  PasswordResetTokenWithUser,
} from './password-reset-token.entity';

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');

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
  deleteExpired(): Promise<void>;
}

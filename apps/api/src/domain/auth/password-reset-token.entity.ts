import { TokenPurposeEnum } from '@porto/contracts';
import { UserEntity } from '@Domain/users/user.entity';

export interface PasswordResetTokenEntity {
  id: number;
  userId: number;
  /** SHA-256 do token. O valor em claro só existe no e-mail enviado ao usuário. */
  tokenHash: string;
  purpose: TokenPurposeEnum;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface PasswordResetTokenWithUser extends PasswordResetTokenEntity {
  user: UserEntity;
}

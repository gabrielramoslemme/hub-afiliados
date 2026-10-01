import { TooManyAttemptsError } from '@Domain/auth/auth.errors';
import { PasswordHasher } from '@Domain/auth/password-hasher';
import { Clock } from '@Domain/shared/clock';
import { UserEntity } from '@Domain/users/user.entity';
import { UserRepository } from '@Domain/users/user.repository';

/** A quinta senha errada seguida trava a conta. */
export const MAX_FAILED_PASSWORD_ATTEMPTS = 5;

const LOCKOUT_MS = 15 * 60 * 1000;

export interface PasswordAttemptDependencies {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  clock: Clock;
}

/**
 * Confere a senha de quem já tem uma, contando os erros: a conta travada recusa
 * antes de comparar — nem a senha certa entra —, o erro soma para a trava e o
 * acerto zera a contagem. Toda conferência de senha passa por aqui, não só o
 * login: uma rota autenticada que confere senha sem limite viraria o caminho
 * para adivinhá-la a partir de uma sessão esquecida aberta.
 */
export async function verifyPasswordAttempt(
  dependencies: PasswordAttemptDependencies,
  user: UserEntity,
  password: string,
): Promise<boolean> {
  const now = dependencies.clock.now();

  if (user.passwordLockedUntil && user.passwordLockedUntil > now) {
    throw new TooManyAttemptsError();
  }

  // Sem senha não há o que adivinhar, e nada a contar.
  if (user.password === null) return false;

  const matches = await dependencies.passwordHasher.compare(password, user.password);

  if (!matches) {
    await dependencies.userRepository.registerFailedPasswordAttempt({
      userId: user.id,
      maxAttempts: MAX_FAILED_PASSWORD_ATTEMPTS,
      lockedUntil: new Date(now.getTime() + LOCKOUT_MS),
    });
    return false;
  }

  if (user.failedPasswordAttempts > 0) {
    await dependencies.userRepository.save({
      id: user.id,
      failedPasswordAttempts: 0,
      passwordLockedUntil: null,
    });
  }

  return true;
}

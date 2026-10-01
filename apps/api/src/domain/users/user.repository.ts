import { AuditTarget } from '@Domain/audit/audit-log.entity';
import { createToken } from '@Domain/shared/token';
import { UserEntity, UserWithAffiliate } from './user.entity';

export const USER_REPOSITORY = createToken<UserRepository>('USER_REPOSITORY');

export interface UpdateUserWithAuditInput {
  userId: number;
  changes: Partial<Pick<UserEntity, 'email'>>;
  /**
   * A trilha em que a edição entra. Não é a do usuário: o e-mail do afiliado mora
   * em `users`, mas quem investiga a conta procura na trilha do afiliado.
   */
  audit: AuditTarget;
}

export interface RegisterFailedPasswordAttemptInput {
  userId: number;
  /** A tentativa que alcança este número trava a conta e zera a contagem. */
  maxAttempts: number;
  lockedUntil: Date;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithAffiliate | null>;
  findByPublicId(publicId: string): Promise<UserWithAffiliate | null>;
  findById(id: number): Promise<UserEntity | null>;
  save(user: Partial<UserEntity>): Promise<UserEntity>;
  /**
   * Grava a edição e a linha de `audit_logs` na mesma transação, com o "antes"
   * lido da linha travada. Lança `EmailAlreadyRegisteredError` quando o índice
   * único recusa o e-mail, e aí a trilha também não é gravada.
   *
   * Nulo quando o usuário não existe.
   */
  updateWithAudit(input: UpdateUserWithAuditInput): Promise<UserEntity | null>;
  /**
   * Soma uma senha errada e trava a conta quando a soma chega ao limite. A conta
   * é feita no banco, numa escrita só: tentativas em paralelo não se perdem.
   */
  registerFailedPasswordAttempt(input: RegisterFailedPasswordAttemptInput): Promise<void>;
}

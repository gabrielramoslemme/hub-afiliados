import { createToken } from '@Domain/shared/token';

export const PASSWORD_HASHER = createToken<PasswordHasher>('PASSWORD_HASHER');

/** Qual algoritmo e qual custo é assunto de infra; o núcleo só compara e gera. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

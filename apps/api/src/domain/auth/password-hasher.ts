import { createToken } from '@Domain/shared/token';

export const PASSWORD_HASHER = createToken<PasswordHasher>('PASSWORD_HASHER');

/** Qual algoritmo e qual custo é assunto de infra; o núcleo só compara e gera. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /**
   * Sem hash — conta que não existe ou que ainda não tem senha —, responde
   * `false` depois de gastar o mesmo trabalho de uma comparação de verdade: o
   * tempo da resposta não pode contar quem tem cadastro.
   */
  compare(plain: string, hash: string | null): Promise<boolean>;
}

import { type ApiErrorCode, AuthErrorCodeEnum } from '@porto/contracts';

/**
 * A tela escolhe a mensagem pelo `code`, nunca pelo texto — regra do `CLAUDE.md`
 * da raiz. O texto da API é a última linha, para um código novo não deixar a
 * pessoa sem explicação nenhuma enquanto a tabela aqui não é atualizada.
 *
 * `INVALID_CREDENTIALS` não diz qual metade errou, de propósito: distinguir
 * "e-mail não existe" de "senha errada" entrega a lista de operadores válidos a
 * quem estiver tentando.
 */
const MESSAGES: Partial<Record<AuthErrorCodeEnum, string>> = {
  [AuthErrorCodeEnum.INVALID_CREDENTIALS]: 'E-mail ou senha inválidos.',
  [AuthErrorCodeEnum.ACCOUNT_INACTIVE]:
    'Esta conta está inativa. Procure quem administra o painel.',
  [AuthErrorCodeEnum.PASSWORD_NOT_SET]:
    'Você ainda não criou uma senha. Use o link enviado por e-mail.',
  [AuthErrorCodeEnum.INVALID_TOKEN]:
    'Este link não vale mais. Ele vale por 2 horas e só pode ser usado uma vez — peça um novo em "Esqueci minha senha".',
};

export function signInMessageFor(code: ApiErrorCode | null, fallback: string): string {
  if (code === null) return fallback;

  return MESSAGES[code as AuthErrorCodeEnum] ?? fallback;
}

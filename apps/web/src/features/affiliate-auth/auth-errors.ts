import { type ApiErrorCode, AuthErrorCodeEnum } from '@porto/contracts';

/**
 * A tela escolhe a mensagem pelo `code`, nunca pelo texto — regra do `CLAUDE.md`
 * da raiz. O texto da API é a última linha, para um código novo não deixar a
 * pessoa sem explicação enquanto esta tabela não é atualizada.
 *
 * As mensagens são diferentes das do painel de propósito: aqui quem lê é o
 * afiliado, e o que ele precisa saber é o que fazer em seguida — esperar o
 * e-mail, abrir o link da senha, escrever para o contato. "Procure quem
 * administra o painel" não significa nada para ele.
 *
 * `INVALID_CREDENTIALS` não diz qual metade errou, de propósito: distinguir
 * "e-mail não existe" de "senha errada" entrega a lista de cadastrados a quem
 * estiver tentando.
 */
const MESSAGES: Partial<Record<AuthErrorCodeEnum, string>> = {
  [AuthErrorCodeEnum.INVALID_CREDENTIALS]: 'E-mail ou senha inválidos.',
  [AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW]:
    'Seu cadastro ainda está em análise. Assim que houver decisão, você recebe um e-mail.',
  [AuthErrorCodeEnum.REGISTRATION_REJECTED]:
    'Seu cadastro não foi aprovado. O motivo foi enviado para o seu e-mail.',
  [AuthErrorCodeEnum.PASSWORD_NOT_SET]:
    'Você ainda não criou sua senha. Use o link que enviamos por e-mail.',
  [AuthErrorCodeEnum.ACCOUNT_INACTIVE]:
    'Sua conta está inativa. Escreva para afiliados@portoservico.com.br.',
};

export function signInMessageFor(code: ApiErrorCode | null, fallback: string): string {
  if (code === null) return fallback;

  return MESSAGES[code as AuthErrorCodeEnum] ?? fallback;
}

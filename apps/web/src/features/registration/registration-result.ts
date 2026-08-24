import type { RegistrationField } from './registration-errors';

export type RegistrationFieldErrors = Partial<Record<RegistrationField, string>>;

/**
 * Três desfechos, e a tela trata os três: seguir, corrigir campo, ou avisar que
 * a falha não foi de quem preencheu. Um `catch` genérico apagaria a diferença
 * entre "seu CPF já está cadastrado" e "a API caiu".
 */
export type RegistrationResult =
  | { status: 'success' }
  | { status: 'invalid'; fieldErrors: RegistrationFieldErrors }
  | { status: 'failed'; message: string };

import {
  type ApiErrorCode,
  type CreateAffiliateRequest,
  RegistrationErrorCodeEnum,
} from '@porto/contracts';

export type RegistrationField = keyof CreateAffiliateRequest;

/**
 * A API recusa o cadastro inteiro; quem se cadastra precisa saber **qual campo**
 * corrigir. Esta tabela é o único lugar que sabe disso — a tela escolhe a
 * mensagem pelo `code`, nunca pelo texto, que é regra do `CLAUDE.md` da raiz.
 */
const FIELD_BY_CODE: Record<RegistrationErrorCodeEnum, RegistrationField> = {
  [RegistrationErrorCodeEnum.INVALID_CPF]: 'cpf',
  [RegistrationErrorCodeEnum.CPF_ALREADY_REGISTERED]: 'cpf',
  [RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED]: 'email',
  [RegistrationErrorCodeEnum.PIX_KEY_INVALID]: 'pixKey',
  [RegistrationErrorCodeEnum.PIX_KEY_MISMATCH]: 'pixKey',
};

/** `null` significa erro de formulário, não de campo: o alerta vai para o topo. */
export function fieldForErrorCode(code: ApiErrorCode | null): RegistrationField | null {
  if (code === null) return null;

  return FIELD_BY_CODE[code as RegistrationErrorCodeEnum] ?? null;
}

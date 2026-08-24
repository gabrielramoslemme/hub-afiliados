import { PixKeyTypeEnum } from '@porto/contracts';

const CPF_DIGITS = 11;
const PHONE_DIGITS = 11;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Máscara progressiva: formata o que já foi digitado sem esperar o campo fechar.
 * Separador que aparece antes do dígito que o justifica trava o cursor no meio
 * da digitação — daí cada faixa só acrescentar o que já tem conteúdo.
 */
export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, CPF_DIGITS);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Fixo (10 dígitos) e celular (11) usam corte diferente antes do hífen. */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, PHONE_DIGITS);

  if (digits.length <= 2) return digits.length === 0 ? '' : `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** E-mail não tem máscara: qualquer formatação atrapalharia quem digita. */
export function formatPixKey(type: PixKeyTypeEnum, value: string): string {
  if (type === PixKeyTypeEnum.CPF) return formatCpf(value);
  if (type === PixKeyTypeEnum.PHONE) return formatPhone(value);

  return value;
}

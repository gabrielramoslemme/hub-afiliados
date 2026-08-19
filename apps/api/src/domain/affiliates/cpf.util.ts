import { cpf } from 'cpf-cnpj-validator';

export function sanitizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  return cpf.isValid(sanitizeCpf(value));
}

/** Máscara para listagem no painel: preserva só os cinco últimos dígitos. */
export function maskCpf(value: string): string {
  const digits = sanitizeCpf(value);
  if (digits.length !== 11) return '***.***.***-**';
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

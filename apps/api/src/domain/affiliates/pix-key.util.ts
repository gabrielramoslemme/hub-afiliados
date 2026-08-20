import { PixKeyTypeEnum } from '@porto/contracts';
import { isValidCpf, sanitizeCpf } from './cpf.util';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** DDD + 8 ou 9 dígitos, com ou sem o código do país. */
const PHONE_DIGITS = /^\d{10,13}$/;

export function normalizePixKey(type: PixKeyTypeEnum, key: string): string {
  const trimmed = key.trim();
  if (type === PixKeyTypeEnum.CPF) return sanitizeCpf(trimmed);
  if (type === PixKeyTypeEnum.PHONE) return trimmed.replace(/\D/g, '');
  return trimmed.toLowerCase();
}

export function isValidPixKey(type: PixKeyTypeEnum, key: string): boolean {
  const normalized = normalizePixKey(type, key);
  if (type === PixKeyTypeEnum.CPF) return isValidCpf(normalized);
  if (type === PixKeyTypeEnum.PHONE) return PHONE_DIGITS.test(normalized);
  return EMAIL_PATTERN.test(normalized);
}

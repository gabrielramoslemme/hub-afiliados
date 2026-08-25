import { PixKeyTypeEnum } from '@porto/contracts';
import { isValidCpf, maskCpf, sanitizeCpf } from './cpf.util';

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

/**
 * O que o próprio afiliado vê da sua chave: o suficiente para reconhecer qual
 * cadastrou, e não o bastante para servir a quem estiver olhando a tela por
 * cima do ombro. Ele já sabe a chave dele — mostrar inteira não ajuda ninguém.
 */
export function maskPixKey(type: PixKeyTypeEnum, key: string): string {
  const normalized = normalizePixKey(type, key);

  if (type === PixKeyTypeEnum.CPF) return maskCpf(normalized);

  if (type === PixKeyTypeEnum.PHONE) {
    return `(${normalized.slice(0, 2)}) *****-${normalized.slice(-4)}`;
  }

  const [local, domain] = normalized.split('@');
  const visible = local.length > 2 ? local.slice(0, 2) : '';

  return `${visible}${'*'.repeat(local.length - visible.length)}@${domain}`;
}

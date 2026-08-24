import type { PixKeyTypeEnum } from '@porto/contracts';
import { formatCpf, formatPixKey } from './masks';

/**
 * Fuso fixo em São Paulo, e não o do navegador: o servidor renderiza a mesma
 * string que o cliente hidrata, e a analista vê o horário do fato — não o da
 * máquina onde o Next está rodando.
 */
const TIME_ZONE = 'America/Sao_Paulo';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/*
  Dinheiro entra e sai em centavos, nunca em reais fracionários: somar `0.1` com
  `0.2` em ponto flutuante dá `0.30000000000000004`, e um extrato que erra o
  centavo é um extrato que ninguém confere duas vezes.
*/
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBRL(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso)).replace(',', '');
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** O CPF mascarado já vem pontuado da API; o completo vem só com dígitos. */
export function formatCpfDisplay(cpf: string): string {
  return cpf.includes('*') ? cpf : formatCpf(cpf);
}

export function formatPixKeyDisplay(type: PixKeyTypeEnum, key: string): string {
  return formatPixKey(type, key);
}

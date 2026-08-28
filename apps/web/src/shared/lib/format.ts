import type { PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';
import { formatCpf, formatPixKey } from './masks';

/** Cada marca escreve o próprio nome de um jeito, e o valor gravado é caixa alta. */
const SOCIAL_NETWORK_NAMES: Record<SocialNetworkEnum, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  FACEBOOK: 'Facebook',
  X: 'X',
  KWAI: 'Kwai',
};

/**
 * O nome da rede em um lugar só: o `select` do cadastro, o detalhe do painel e
 * o perfil do afiliado leem daqui. Duas listas divergiriam na primeira rede nova.
 */
export function socialNetworkName(network: SocialNetworkEnum): string {
  return SOCIAL_NETWORK_NAMES[network];
}

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

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
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

/** A hora sozinha: na fila, dia e hora empilhados leem melhor que a linha inteira. */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** O CPF mascarado já vem pontuado da API; o completo vem só com dígitos. */
export function formatCpfDisplay(cpf: string): string {
  return cpf.includes('*') ? cpf : formatCpf(cpf);
}

export function formatPixKeyDisplay(type: PixKeyTypeEnum, key: string): string {
  return formatPixKey(type, key);
}

/**
 * Rede e `@` só dizem alguma coisa juntos, então quem tem metade do par não tem
 * nada a mostrar — e a tela some com a linha em vez de imprimir um vazio.
 */
export function formatSocialProfile(
  network: SocialNetworkEnum | null,
  handle: string | null,
): string | null {
  if (!network || !handle) return null;

  return `@${handle.replace(/^@+/, '')} no ${socialNetworkName(network)}`;
}

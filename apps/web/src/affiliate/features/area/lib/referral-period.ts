import { ReferralPeriodEnum } from '@porto/contracts';
import { AFFILIATE_AREA_PATH } from '@/affiliate/shared/routes';

export type RawSearchParams = Record<string, string | string[] | undefined>;

/*
  O valor da URL é em português porque é o endereço que a pessoa vê e
  compartilha; o do contrato continua sendo o enum.
*/
const SLUGS: Record<ReferralPeriodEnum, string> = {
  [ReferralPeriodEnum.LAST_30_DAYS]: '30-dias',
  [ReferralPeriodEnum.YEAR]: 'ano',
  [ReferralPeriodEnum.ALL]: 'tudo',
};

const DEFAULT_PERIOD = ReferralPeriodEnum.LAST_30_DAYS;

/**
 * O período da lista de indicações mora na URL, como os filtros da fila do
 * painel: recarregar e voltar mantêm a aba. Valor desconhecido vira o padrão em
 * vez de seguir para a API, que o recusaria com 400.
 */
export function parseReferralPeriod(raw: RawSearchParams): ReferralPeriodEnum {
  const value = Array.isArray(raw.periodo) ? raw.periodo[0] : raw.periodo;
  const match = Object.entries(SLUGS).find(([, slug]) => slug === value);

  return match ? (match[0] as ReferralPeriodEnum) : DEFAULT_PERIOD;
}

/** O padrão fica fora da URL: o Início abre limpo, sem `?periodo=30-dias`. */
export function referralPeriodHref(period: ReferralPeriodEnum): string {
  return period === DEFAULT_PERIOD
    ? AFFILIATE_AREA_PATH
    : `${AFFILIATE_AREA_PATH}?periodo=${SLUGS[period]}`;
}

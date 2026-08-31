import type { StatusTone } from '@/shared/lib/affiliate-status';

/**
 * Números de exemplo da tela inicial do painel. A Onda 1 não tem as tabelas que
 * respondem por faturamento, comissão paga e venda — elas nascem com o módulo de
 * Pagamentos —, então a tela é montada aqui até existir uma leitura de verdade
 * em `data.ts`.
 *
 * O dado é ilustrativo e mesmo assim fecha a conta: a comissão sai da mesma taxa
 * sobre a receita em toda a tela, os segmentos somam o total de afiliados e as
 * fatias somam 100%. Painel de exemplo que não bate consigo mesmo é o que ensina
 * a não conferir o painel de verdade — `mock-data.spec.ts` trava cada uma dessas
 * somas.
 */

/** O que o programa paga sobre a receita que o afiliado gera. */
export const COMMISSION_RATE = 0.15;

export const headline = {
  grossRevenueCents: 2_000_000_000,
  revenueGrowthPercent: 12,
  paidCommissionsCents: 270_000_000,
  pendingCommissionsCents: 30_000_000,
  totalSales: 100_000,
  salesGrowthPercent: 12,
};

/** A base inativa não é uma situação de cadastro, mas divide a barra com elas. */
export type SegmentTone = StatusTone | 'inactive';

export interface BaseSegment {
  tone: SegmentTone;
  label: string;
  count: number;
}

/**
 * O tom vem do mesmo vocabulário do `Badge` da fila: a analista aprende uma cor
 * por situação, e ela não pode mudar de significado entre duas telas do painel.
 */
export const affiliateBase: { total: number; segments: BaseSegment[] } = {
  total: 156,
  segments: [
    { tone: 'approved', label: 'Aprovados', count: 98 },
    { tone: 'pending', label: 'Pendentes', count: 12 },
    { tone: 'inactive', label: 'Inativos', count: 34 },
    { tone: 'rejected', label: 'Reprovados', count: 12 },
  ],
};

export const attention = {
  pendingReviews: 12,
  failedWithdrawals: 5,
};

export const performance = {
  ratePercent: 72,
  goalPercent: 65,
};

export interface TrendPoint {
  month: string;
  salesCents: number;
  commissionsCents: number;
}

export const monthlyTrend: TrendPoint[] = [
  { month: 'Jan', salesCents: 160_000_000, commissionsCents: 24_000_000 },
  { month: 'Fev', salesCents: 220_000_000, commissionsCents: 33_000_000 },
  { month: 'Mar', salesCents: 260_000_000, commissionsCents: 39_000_000 },
  { month: 'Abr', salesCents: 250_000_000, commissionsCents: 37_500_000 },
  { month: 'Mai', salesCents: 230_000_000, commissionsCents: 34_500_000 },
  { month: 'Jun', salesCents: 240_000_000, commissionsCents: 36_000_000 },
  { month: 'Jul', salesCents: 310_000_000, commissionsCents: 46_500_000 },
];

export const trendPeriod = 'Jan–Jul';

export interface CategorySlice {
  category: string;
  sharePercent: number;
}

export const categoryMix: CategorySlice[] = [
  { category: 'Guincho', sharePercent: 40 },
  { category: 'Chaveiro', sharePercent: 30 },
  { category: 'Oficina', sharePercent: 20 },
  { category: 'Outros', sharePercent: 10 },
];

export interface RankedAffiliate {
  name: string;
  category: string;
  sales: number;
  revenueCents: number;
  commissionCents: number;
}

export const topAffiliates: RankedAffiliate[] = [
  {
    name: 'José Araújo Silva',
    category: 'Guincho',
    sales: 120,
    revenueCents: 2_000_000,
    commissionCents: 300_000,
  },
  {
    name: 'Marcela Andrade',
    category: 'Chaveiro',
    sales: 100,
    revenueCents: 1_000_000,
    commissionCents: 150_000,
  },
  {
    name: 'Josias Machado Silva',
    category: 'Oficina',
    sales: 99,
    revenueCents: 900_000,
    commissionCents: 135_000,
  },
  {
    name: 'Amanda Soares',
    category: 'Guincho',
    sales: 70,
    revenueCents: 900_000,
    commissionCents: 135_000,
  },
  {
    name: 'Maria Lima Souza',
    category: 'Chaveiro',
    sales: 50,
    revenueCents: 800_000,
    commissionCents: 120_000,
  },
];

/** O mês que a tela inteira está descrevendo — cabeçalho e ranking leem daqui. */
export const currentPeriod = 'Agosto 2026';

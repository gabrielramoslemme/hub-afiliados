import {
  type AffiliateReferral,
  type AffiliateReferralsResponse,
  type AffiliateStatementEntry,
  type AffiliateWalletResponse,
  ReferralPeriodEnum,
  ReferralStatusEnum,
  StatementEntryKindEnum,
} from '@porto/contracts';

/*
  O "agora" das fixtures. As datas são fixas: `new Date()` aqui faria a mesma
  tela mudar entre dois reloads, e ninguém confia no que muda sozinho. Pelo
  mesmo motivo o recorte de período conta a partir daqui, e não do relógio.
*/
const UPDATED_AT = '2026-08-21T12:00:00.000Z';

/*
  As vendas feitas com o cupom, da mais recente para a mais antiga. As de 2025
  existem para que "Ano" e "Tudo" não devolvam a mesma lista.
*/
const REFERRALS: AffiliateReferral[] = [
  {
    id: 'r13',
    status: ReferralStatusEnum.PENDING,
    title: 'Serviços Residenciais',
    detail: 'Encanador',
    saleCents: 22000,
    incentiveCents: 2200,
    occurredAt: '2026-08-19T13:20:00.000Z',
  },
  {
    id: 'r12',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Serviços Automotivos',
    detail: 'Guincho 24h',
    saleCents: 38000,
    incentiveCents: 3800,
    occurredAt: '2026-08-18T14:12:00.000Z',
  },
  {
    id: 'r11',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Vidros Automotivos',
    detail: 'Para-brisa',
    saleCents: 89000,
    incentiveCents: 8900,
    occurredAt: '2026-08-12T16:28:00.000Z',
  },
  {
    id: 'r10',
    status: ReferralStatusEnum.PENDING,
    title: 'Serviços Residenciais',
    detail: 'Eletricista',
    saleCents: 26000,
    incentiveCents: 2600,
    occurredAt: '2026-08-06T10:15:00.000Z',
  },
  {
    id: 'r9',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Funilaria e Pintura',
    detail: 'Reparo de lataria',
    saleCents: 120000,
    incentiveCents: 12000,
    occurredAt: '2026-07-30T09:40:00.000Z',
  },
  {
    id: 'r8',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Limpeza',
    detail: 'Limpeza de sofá',
    saleCents: 24000,
    incentiveCents: 2400,
    occurredAt: '2026-07-08T18:47:00.000Z',
  },
  {
    id: 'r7',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Serviços Residenciais',
    detail: 'Chaveiro',
    saleCents: 15000,
    incentiveCents: 1500,
    occurredAt: '2026-06-21T11:05:00.000Z',
  },
  {
    id: 'r6',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Climatização',
    detail: 'Instalação de ar-condicionado',
    saleCents: 65000,
    incentiveCents: 6500,
    occurredAt: '2026-06-02T15:30:00.000Z',
  },
  {
    id: 'r5',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Serviços Automotivos',
    detail: 'Troca de bateria',
    saleCents: 48000,
    incentiveCents: 4800,
    occurredAt: '2026-05-14T08:50:00.000Z',
  },
  {
    id: 'r4',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Serviços Residenciais',
    detail: 'Dedetização',
    saleCents: 32000,
    incentiveCents: 3200,
    occurredAt: '2026-04-27T10:03:00.000Z',
  },
  {
    id: 'r3',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Serviços Residenciais',
    detail: 'Montagem de móveis',
    saleCents: 20000,
    incentiveCents: 2000,
    occurredAt: '2026-04-09T14:22:00.000Z',
  },
  {
    id: 'r2',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Serviços Residenciais',
    detail: 'Encanador',
    saleCents: 18000,
    incentiveCents: 1800,
    occurredAt: '2025-12-15T17:10:00.000Z',
  },
  {
    id: 'r1',
    status: ReferralStatusEnum.COMPLETED,
    title: 'Vidros Automotivos',
    detail: 'Retrovisor',
    saleCents: 31000,
    incentiveCents: 3100,
    occurredAt: '2025-11-28T09:35:00.000Z',
  },
];

const COMPLETED = REFERRALS.filter((referral) => referral.status === ReferralStatusEnum.COMPLETED);

/*
  Os pagamentos da Porto na chave do afiliado. Cada um quita tudo o que foi
  confirmado até o mês anterior, e o saldo que sobra é o que entrou depois.
*/
const PAYOUTS: AffiliateStatementEntry[] = [
  {
    id: 'p2',
    kind: StatementEntryKindEnum.PAYOUT,
    title: 'Pagamento via PIX',
    detail: 'Enviado para a sua chave',
    cents: 22400,
    occurredAt: '2026-08-10T11:05:00.000Z',
  },
  {
    id: 'p1',
    kind: StatementEntryKindEnum.PAYOUT,
    title: 'Pagamento via PIX',
    detail: 'Enviado para a sua chave',
    cents: 14900,
    occurredAt: '2026-06-10T11:05:00.000Z',
  },
];

/*
  Todo incentivo do extrato nasce de uma venda concluída, e só dela. É o que faz
  a tela inicial e a carteira, que mostram o mesmo dinheiro, fecharem entre si.
*/
const STATEMENT: AffiliateStatementEntry[] = [
  ...COMPLETED.map((referral) => ({
    id: `i-${referral.id}`,
    kind: StatementEntryKindEnum.INCENTIVE,
    title: referral.title,
    detail: referral.detail,
    cents: referral.incentiveCents,
    occurredAt: referral.occurredAt,
  })),
  ...PAYOUTS,
].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function totalOf(kind: StatementEntryKindEnum): number {
  return sum(STATEMENT.filter((entry) => entry.kind === kind).map((entry) => entry.cents));
}

/*
  Saldo e pago saem da soma das linhas, nunca de um número escrito à mão. É o
  erro da referência que serviu de base: lá o saldo do topo não fecha com o
  extrato de baixo, e um extrato que não fecha ensina a não conferir extrato.
*/
export const mockWallet: AffiliateWalletResponse = {
  balanceCents: totalOf(StatementEntryKindEnum.INCENTIVE) - totalOf(StatementEntryKindEnum.PAYOUT),
  paidCents: totalOf(StatementEntryKindEnum.PAYOUT),
  updatedAt: UPDATED_AT,
  entries: STATEMENT,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Onde cada período começa. O ano vira à meia-noite de São Paulo, não à de
 * Greenwich: uma venda da noite de 31 de dezembro é do ano que terminou.
 */
function periodStart(period: ReferralPeriodEnum): number {
  const now = new Date(UPDATED_AT);

  switch (period) {
    case ReferralPeriodEnum.LAST_30_DAYS:
      return now.getTime() - 30 * DAY_MS;
    case ReferralPeriodEnum.YEAR:
      return new Date(`${now.getUTCFullYear()}-01-01T00:00:00-03:00`).getTime();
    case ReferralPeriodEnum.ALL:
      return Number.NEGATIVE_INFINITY;
  }
}

/** O recorte que a API vai fazer com `WHERE`, feito em memória. */
export function mockReferrals(period: ReferralPeriodEnum): AffiliateReferralsResponse {
  const since = periodStart(period);

  return {
    summary: {
      salesCents: sum(COMPLETED.map((referral) => referral.saleCents)),
      salesCount: COMPLETED.length,
      confirmedIncentiveCents: sum(COMPLETED.map((referral) => referral.incentiveCents)),
      couponUses: REFERRALS.length,
    },
    updatedAt: UPDATED_AT,
    entries: REFERRALS.filter((referral) => new Date(referral.occurredAt).getTime() >= since),
  };
}

import {
  type AffiliateStatementEntry,
  type AffiliateWalletResponse,
  StatementEntryKindEnum,
} from '@porto/contracts';

/*
  Extrato de exemplo. As datas são fixas: `new Date()` aqui faria a mesma tela
  mudar entre dois reloads, e ninguém confia no que muda sozinho.
*/
const ENTRIES: AffiliateStatementEntry[] = [
  {
    id: 'e1',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Serviços Automotivos',
    detail: 'Guincho 24h',
    cents: 32000,
    occurredAt: '2026-08-18T14:12:00.000Z',
  },
  {
    id: 'e2',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Serviços Residenciais',
    detail: 'Encanador',
    cents: 16000,
    occurredAt: '2026-08-15T09:40:00.000Z',
  },
  {
    id: 'e3',
    kind: StatementEntryKindEnum.PAYOUT,
    title: 'Pagamento via PIX',
    detail: 'Enviado para a sua chave',
    cents: 20000,
    occurredAt: '2026-08-14T11:05:00.000Z',
  },
  {
    id: 'e4',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Vidros Automotivos',
    detail: 'Para-brisa',
    cents: 8000,
    occurredAt: '2026-08-12T16:28:00.000Z',
  },
  {
    id: 'e5',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Funilaria e Pintura',
    detail: 'Reparo de lataria',
    cents: 10000,
    occurredAt: '2026-08-09T10:03:00.000Z',
  },
  {
    id: 'e6',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Seguro Residencial',
    detail: 'Apólice anual',
    cents: 6000,
    occurredAt: '2026-08-05T18:47:00.000Z',
  },
];

function totalOf(kind: StatementEntryKindEnum): number {
  return ENTRIES.filter((entry) => entry.kind === kind).reduce(
    (total, entry) => total + entry.cents,
    0,
  );
}

/*
  Saldo e pago saem da soma das linhas, nunca de um número escrito à mão. É o
  erro da referência que serviu de base: lá o saldo do topo não fecha com o
  extrato de baixo, e um extrato que não fecha ensina a não conferir extrato.
*/
export const mockWallet: AffiliateWalletResponse = {
  balanceCents: totalOf(StatementEntryKindEnum.INCENTIVE) - totalOf(StatementEntryKindEnum.PAYOUT),
  paidCents: totalOf(StatementEntryKindEnum.PAYOUT),
  updatedAt: '2026-08-21T12:00:00.000Z',
  entries: ENTRIES,
};

import type {
  PayoutEventOutcomeEnum,
  PayoutEventSourceEnum,
  PixKeyTypeEnum,
  WithdrawalStatusEnum,
} from '../enums';

/**
 * A resposta do pedido de saque. `REQUESTED` quer dizer, para a tela, "em
 * processamento": o pedido está gravado, e o PIX sai quando o fornecedor
 * responder.
 */
export interface AffiliateWithdrawalResponse {
  id: string;
  status: WithdrawalStatusEnum;
  amountCents: number;
  requestedAt: string;
}

/** Uma linha da lista de saques do painel. CPF já vem mascarado da API. */
export interface WithdrawalListItem {
  publicId: string;
  affiliatePublicId: string;
  affiliateName: string;
  maskedCpf: string;
  amountCents: number;
  status: WithdrawalStatusEnum;
  requestedAt: string;
  paidAt: string | null;
}

/** Uma venda cujo incentivo o saque pagou. */
export interface WithdrawalSaleItem {
  publicId: string;
  item: string;
  incentiveCents: number;
  settledAt: string;
}

/** Uma notificação ou consulta do fornecedor, como ficou na trilha. */
export interface WithdrawalEventItem {
  publicId: string;
  source: PayoutEventSourceEnum;
  /** O status como o fornecedor o escreve (`FINALIZADO`); nulo quando o corpo não trazia. */
  providerStatus: string | null;
  outcome: PayoutEventOutcomeEnum;
  receivedAt: string;
}

/**
 * O detalhe de um saque no painel. A chave sai mascarada mesmo aqui: conferir
 * pede o tipo, o final e o identificador do PIX, não a chave inteira.
 */
export interface WithdrawalDetail extends WithdrawalListItem {
  pixKeyType: PixKeyTypeEnum;
  maskedPixKey: string;
  endToEndId: string | null;
  receiptUrl: string | null;
  failureReason: string | null;
  failedAt: string | null;
  returnedAt: string | null;
  /** Vazio quando o saque falhou ou voltou: as vendas voltaram ao saldo. */
  sales: WithdrawalSaleItem[];
  events: WithdrawalEventItem[];
}

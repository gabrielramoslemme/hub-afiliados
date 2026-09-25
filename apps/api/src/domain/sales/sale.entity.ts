import { IncentiveStatusEnum } from '@porto/contracts';

/**
 * Uma venda feita com o cupom de um afiliado, no estado em que a última
 * notificação da Porto Serviços a deixou. É a fonte da tela de Vendas do painel
 * e das entradas do extrato do afiliado — a trilha de cada chamada recebida mora
 * em `IncentiveEventEntity`.
 *
 * Nenhum dado do cliente final: a venda chega identificada pelo id da Porto e
 * pelo cupom, nunca por quem comprou.
 */
export interface SaleEntity {
  id: number;
  publicId: string;
  couponId: number;
  /** O `venda.id` da Porto: estável ao longo das notificações da mesma venda. */
  externalId: string;
  /** Em centavos, nunca em float. A Porto manda sempre o valor original da compra. */
  amountCents: number;
  /**
   * O incentivo do afiliado nesta venda, em centavos, como a Porto decidiu. É o
   * do último evento aplicado: o do registro enquanto pendente, e o do
   * encerramento depois — que é o que ela paga.
   */
  incentiveCents: number;
  item: string;
  incentiveStatus: IncentiveStatusEnum;
  /** A `venda.dataVenda` da Porto: quando o cliente comprou, não quando nos avisaram. */
  soldAt: Date;
  /** Quando a venda foi concluída ou cancelada; nulo enquanto pendente. */
  settledAt: Date | null;
  /**
   * O saque que reservou este incentivo; nulo enquanto ele está no saldo. Volta
   * a nulo quando o saque falha ou é devolvido.
   */
  withdrawalId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

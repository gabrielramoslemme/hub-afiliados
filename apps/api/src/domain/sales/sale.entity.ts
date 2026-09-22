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
  item: string;
  incentiveStatus: IncentiveStatusEnum;
  registeredAt: Date;
  /** Quando a venda foi concluída ou cancelada; nulo enquanto pendente. */
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

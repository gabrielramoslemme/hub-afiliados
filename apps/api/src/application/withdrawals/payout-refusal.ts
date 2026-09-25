import { WithdrawalStatusEnum } from '@porto/contracts';
import { PayoutUpdate } from '@Domain/withdrawals/payout-gateway';

/**
 * A recusa do fornecedor na hora do pedido, como desfecho do saque. Não veio
 * de notificação nenhuma: não há corpo dele para a trilha.
 */
export function refusalUpdate(reference: string, reason: string): PayoutUpdate {
  return {
    reference,
    status: WithdrawalStatusEnum.FAILED,
    providerStatus: 'REFUSED',
    providerTransferId: null,
    endToEndId: null,
    receiptUrl: null,
    failureReason: reason,
    payload: {},
  };
}

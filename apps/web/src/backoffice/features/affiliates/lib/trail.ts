import {
  type AffiliateStatusHistoryItem,
  type CouponHistoryItem,
  CouponStatusEnum,
} from '@porto/contracts';
import { statusLabel } from '@/shared/lib/affiliate-status';

/** Uma linha da trilha de auditoria do detalhe, venha ela do cadastro ou do cupom. */
export interface TrailEntry {
  key: string;
  title: string;
  createdAt: string;
  actorName: string | null;
  reason: string | null;
}

function couponTitle(entry: CouponHistoryItem): string {
  if (entry.fromStatus === null) {
    return `Cupom emitido com ${entry.toDiscountPercent}% de desconto`;
  }

  const changes: string[] = [];

  if (entry.fromStatus !== entry.toStatus) {
    changes.push(
      entry.toStatus === CouponStatusEnum.INACTIVE ? 'Cupom desativado' : 'Cupom reativado',
    );
  }
  if (entry.fromDiscountPercent !== entry.toDiscountPercent) {
    changes.push(`Desconto de ${entry.fromDiscountPercent}% para ${entry.toDiscountPercent}%`);
  }

  // A Porto aceita reafirmar o que já valia; a trilha registra o pedido mesmo assim.
  return changes.join(' · ') || 'Cupom confirmado sem alteração';
}

/**
 * A trilha do cadastro e a do cupom numa só, do mais recente para o mais
 * antigo. Para quem audita, aprovar e emitir o cupom são a mesma história — e
 * duas listas lado a lado obrigariam a cruzar datas de cabeça.
 */
export function buildTrail(
  statusHistory: AffiliateStatusHistoryItem[],
  couponHistory: CouponHistoryItem[],
): TrailEntry[] {
  const coupon = couponHistory.map((entry, index) => ({
    key: `coupon-${entry.createdAt}-${index}`,
    title: couponTitle(entry),
    createdAt: entry.createdAt,
    actorName: entry.actorName,
    reason: null,
  }));

  const status = statusHistory.map((entry, index) => ({
    key: `status-${entry.createdAt}-${index}`,
    title:
      entry.fromStatus === null
        ? 'Cadastro recebido'
        : `${statusLabel(entry.fromStatus)} → ${statusLabel(entry.toStatus)}`,
    createdAt: entry.createdAt,
    actorName: entry.actorName,
    reason: entry.reason,
  }));

  /*
    O cupom entra primeiro de propósito: emissão e aprovação saem da mesma
    transação, com o mesmo instante, e o `sort` estável mantém esta ordem —
    lida de baixo para cima, a aprovação vem antes do cupom que ela emitiu.
  */
  return [...coupon, ...status].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

import { AffiliateStatusEnum } from '@porto/contracts';

export type StatusTone = 'pending' | 'approved' | 'rejected';

/**
 * O rótulo em pt-BR e o tom moram juntos porque são a mesma decisão, e moram em
 * `core/` porque duas telas os usam: a fila do painel e a área do afiliado.
 * Espalhar isso pelas features é como um status ganha nome diferente em cada
 * lugar.
 */
const STATUS: Record<AffiliateStatusEnum, { label: string; tone: StatusTone }> = {
  [AffiliateStatusEnum.PENDING_APPROVAL]: { label: 'Em análise', tone: 'pending' },
  [AffiliateStatusEnum.APPROVED]: { label: 'Aprovado', tone: 'approved' },
  [AffiliateStatusEnum.REJECTED]: { label: 'Reprovado', tone: 'rejected' },
};

export function statusLabel(status: AffiliateStatusEnum): string {
  return STATUS[status].label;
}

export function statusTone(status: AffiliateStatusEnum): StatusTone {
  return STATUS[status].tone;
}

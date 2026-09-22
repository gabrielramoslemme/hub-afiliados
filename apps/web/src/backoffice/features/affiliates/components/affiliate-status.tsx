import type { AffiliateStatusEnum } from '@porto/contracts';
import { Badge } from '@/shared/components/ui/badge';
import { statusLabel, statusTone } from '@/shared/lib/affiliate-status';

export { statusLabel };

/**
 * O ponto antes do rótulo carrega a cor; o texto continua legível sem ela. Cor
 * sozinha não é informação — quem não distingue verde de vermelho lê a palavra.
 */
export function AffiliateStatusBadge({ status }: { status: AffiliateStatusEnum }) {
  return (
    <Badge tone={statusTone(status)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {statusLabel(status)}
    </Badge>
  );
}

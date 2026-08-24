import type { AffiliateStatusEnum } from '@porto/contracts';
import { Badge } from '@/components/ui/badge';
import { statusLabel, statusTone } from '@/core/affiliate-status';

export { statusLabel };

export function AffiliateStatusBadge({ status }: { status: AffiliateStatusEnum }) {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>;
}

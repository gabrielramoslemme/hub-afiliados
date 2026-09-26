import type { WithdrawalStatusEnum } from '@porto/contracts';
import { Badge } from '@/shared/components/ui/badge';
import { WITHDRAWAL_STATUS_LABELS, withdrawalStatusTone } from '@/shared/lib/withdrawal-status';

export function WithdrawalStatusBadge({ status }: { status: WithdrawalStatusEnum }) {
  return <Badge tone={withdrawalStatusTone(status)}>{WITHDRAWAL_STATUS_LABELS[status]}</Badge>;
}

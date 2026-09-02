import { Badge } from '@/shared/components/ui/badge';
import { campaignStatusLabel, campaignStatusTone } from '../campaign-display';
import type { CampaignStatus } from '../mock-data';

/**
 * O ponto antes do rótulo carrega a cor; o texto continua legível sem ela. Cor
 * sozinha não é informação — quem não distingue verde de vermelho lê a palavra.
 */
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge tone={campaignStatusTone(status)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {campaignStatusLabel(status)}
    </Badge>
  );
}

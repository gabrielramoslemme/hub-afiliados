import { formatDate } from '@/shared/lib/format';
import type { Campaign, CampaignStatus } from './mock-data';

type CampaignStatusTone = 'approved' | 'brand' | 'neutral' | 'rejected';

/**
 * O rótulo em pt-BR e o tom moram juntos porque são a mesma decisão. O tom sai
 * do vocabulário que o `Badge` já usa na fila de afiliados: a analista aprende
 * uma cor por situação, e ela não pode mudar de significado entre duas telas.
 */
const STATUS: Record<CampaignStatus, { label: string; tone: CampaignStatusTone }> = {
  active: { label: 'Ativa', tone: 'approved' },
  scheduled: { label: 'Agendada', tone: 'brand' },
  ended: { label: 'Encerrada', tone: 'neutral' },
  canceled: { label: 'Cancelada', tone: 'rejected' },
};

/** A ordem do ciclo de vida: o que está no ar primeiro, o que morreu por último. */
export const CAMPAIGN_STATUSES: CampaignStatus[] = ['active', 'scheduled', 'ended', 'canceled'];

export function campaignStatusLabel(status: CampaignStatus): string {
  return STATUS[status].label;
}

export function campaignStatusTone(status: CampaignStatus): CampaignStatusTone {
  return STATUS[status].tone;
}

const participantsFormatter = new Intl.NumberFormat('pt-BR');

export function formatParticipants(participants: number): string {
  return participantsFormatter.format(participants);
}

/**
 * O período numa string só. Campanha é um intervalo, e ler "começa" e "termina"
 * em dois lugares da tela obriga a analista a remontar o intervalo de cabeça.
 */
export function formatCampaignPeriod(campaign: Pick<Campaign, 'startsAt' | 'endsAt'>): string {
  return `${formatDate(campaign.startsAt)} até ${formatDate(campaign.endsAt)}`;
}

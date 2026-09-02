'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { formatBRL } from '@/shared/lib/format';
import { formatCampaignPeriod, formatParticipants } from '../campaign-display';
import type { Campaign } from '../mock-data';
import { CampaignStatusBadge } from './campaign-status';

function Entry({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-eyebrow uppercase text-ink-400">{label}</dt>
      <dd className="mt-1.5 text-[0.9375rem] font-semibold text-ink-900" data-tabular>
        {children}
      </dd>
    </div>
  );
}

interface CampaignDetailDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * O detalhe abre sobre a listagem em vez de virar rota: campanha não tem página
 * própria enquanto não houver o que editar nela, e atravessar duas navegações
 * para conferir período e bônus é o que faz a analista parar de conferir.
 */
export function CampaignDetailDialog({ campaign, open, onOpenChange }: CampaignDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>{campaign.name}</DialogTitle>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <DialogDescription>{campaign.description}</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ink-200 pt-5">
          <Entry label="Período">{formatCampaignPeriod(campaign)}</Entry>
          <Entry label="Categoria">{campaign.category}</Entry>
          <Entry label="Regra">{campaign.bonusPercent}% de bônus</Entry>
          <Entry label="Participantes">{formatParticipants(campaign.participants)}</Entry>
          <Entry label="Valor gerado">{formatBRL(campaign.generatedCents)}</Entry>
          <Entry label="Pendente">
            <span className="text-blue-600">{formatBRL(campaign.pendingCents)}</span>
          </Entry>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

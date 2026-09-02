import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/components/ui/button';
import { formatBRL } from '@/shared/lib/format';
import { formatCampaignPeriod, formatParticipants } from '../campaign-display';
import { currentCampaign, newParticipantsThisWeek } from '../mock-data';
import { CampaignStatusBadge } from './campaign-status';

function Stat({ label, value, note }: { label: string; value: string; note: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold leading-tight text-ink-900" data-tabular>
        {value}
      </p>
      <p className="mt-1 text-[0.8125rem] font-semibold" data-tabular>
        {note}
      </p>
    </div>
  );
}

/**
 * O destaque do topo. A campanha no ar é a única que a analista pode afetar
 * hoje, e ela responde de relance as duas perguntas do dia — quanto já gerou e
 * quanta gente está participando —, sem obrigar a caçar a linha na tabela.
 *
 * Editar depende de uma rota que a Onda 1 não tem: o botão fica desabilitado e
 * dito, em vez de sumir. Some é o que faz alguém procurar onde não existe.
 */
export function CurrentCampaign() {
  return (
    <section
      aria-label="Campanha atual"
      className="surface-card rounded-panel border border-ink-200 p-5 shadow-card lg:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
        <div className="min-w-0 max-w-xl">
          <div className="flex items-center gap-3">
            <p className="text-eyebrow uppercase text-ink-400">Campanha atual</p>
            <CampaignStatusBadge status={currentCampaign.status} />
          </div>

          <h2 className="mt-2.5 text-xl font-bold tracking-[-0.02em] text-ink-900">
            {currentCampaign.name}
          </h2>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
            {currentCampaign.description}
          </p>
          <p className="mt-3 text-[0.8125rem] text-ink-400" data-tabular>
            {formatCampaignPeriod(currentCampaign)}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
          <Stat
            label="Valor gerado"
            value={formatBRL(currentCampaign.generatedCents)}
            note={
              <span className="text-blue-600">
                {formatBRL(currentCampaign.pendingCents)} pendente
              </span>
            }
          />
          <Stat
            label="Nº de participantes"
            value={formatParticipants(currentCampaign.participants)}
            note={
              <span className="text-[var(--status-approved)]">
                +{newParticipantsThisWeek} essa semana
              </span>
            }
          />

          <Button variant="ghost" size="icon" disabled className="mt-1">
            <Pencil aria-hidden />
            <span className="sr-only">Editar campanha — em breve</span>
          </Button>
        </div>
      </div>
    </section>
  );
}

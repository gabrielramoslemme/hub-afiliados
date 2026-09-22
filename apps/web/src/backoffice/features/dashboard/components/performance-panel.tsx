import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { AffiliateStatusEnum } from '@porto/contracts';
import { QUEUE_PATH } from '@/backoffice/shared/routes';
import { attention, performance } from '../lib/mock-data';
import { Panel } from './panel';

function Count({ value, className }: { value: number; className: string }) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold ${className}`}
      data-tabular
    >
      {value}
    </span>
  );
}

/**
 * Meta e pendências dividem o painel porque respondem à mesma pergunta: a base
 * está indo bem, e o que está travado nela. Antes eram três cartões — dois deles
 * com um botão cada, um dos botões apagado —, e o desativado pesava tanto quanto
 * a única ação viva da tela.
 */
export function PerformancePanel() {
  return (
    <Panel className="flex flex-col p-5">
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-bold text-[var(--status-approved)]" data-tabular>
          {performance.ratePercent}%
        </span>
        <span className="text-sm text-ink-500">da meta de {performance.goalPercent}%</span>
      </p>

      {/*
        A barra existe para a meta ter lugar no desenho: "72%" sozinho não diz se
        passou de 65% ou faltou. O traço marca a meta sobre o trilho, e o número
        continua escrito ao lado — cor e posição não carregam a informação
        sozinhas.
      */}
      <div
        role="progressbar"
        aria-label="Performance contra a meta"
        aria-valuenow={performance.ratePercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative mt-3 h-2 rounded-pill bg-ink-100"
      >
        <span
          className="block h-full rounded-pill bg-[var(--status-approved)]"
          style={{ width: `${performance.ratePercent}%` }}
        />
        <span
          className="absolute -inset-y-1 w-0.5 rounded-pill bg-ink-400"
          style={{ left: `${performance.goalPercent}%` }}
          aria-hidden
        />
      </div>

      <p className="mt-3 text-[0.8125rem] text-ink-500">
        Afiliados aprovados com ao menos 1 venda nos últimos 30 dias
      </p>

      <hr className="my-5 border-ink-200" />

      <ul className="flex flex-col gap-1">
        <li>
          <Link
            href={`${QUEUE_PATH}?status=${AffiliateStatusEnum.PENDING_APPROVAL}`}
            className="flex items-center gap-3 rounded-card p-2 transition-colors hover:bg-ink-50"
          >
            <Count
              value={attention.pendingReviews}
              className="bg-[var(--status-pending-surface)] text-[var(--status-pending)]"
            />
            <span className="flex-1 text-sm text-ink-700">cadastros aguardando avaliação</span>
            <ChevronRight className="size-4 shrink-0 text-ink-400" aria-hidden />
          </Link>
        </li>

        <li className="flex items-center gap-3 p-2">
          {/* Falha de saque é erro, não pendência: a cor tem que dizer isso. */}
          <Count
            value={attention.failedWithdrawals}
            className="bg-[var(--status-rejected-surface)] text-[var(--status-rejected)]"
          />
          <span className="flex-1 text-sm text-ink-700">Saques com falha</span>
          {/* A tela de Pagamentos não existe na Onda 1: a linha informa e não
              promete clique, com a mesma etiqueta que a navegação usa. */}
          <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-500">
            Em breve
          </span>
        </li>
      </ul>
    </Panel>
  );
}

import type { ReactNode } from 'react';
import type { AffiliateReferralsSummary } from '@porto/contracts';
import { cn } from '@/shared/lib/cn';
import { formatBRL } from '@/shared/lib/format';

const countFormatter = new Intl.NumberFormat('pt-BR');

interface CardProps {
  label: string;
  value: string;
  note?: ReactNode;
  highlight?: boolean;
  valueClassName?: string;
}

function Card({ label, value, note, highlight = false, valueClassName }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-panel p-5',
        highlight
          ? 'surface-brand surface-mesh relative isolate overflow-hidden text-white shadow-float'
          : 'border border-ink-200 bg-white',
      )}
    >
      <p className={cn('text-eyebrow uppercase', highlight ? 'text-blue-200' : 'text-ink-400')}>
        {label}
      </p>
      <p
        className={cn(
          'mt-2.5 text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em]',
          highlight ? 'text-white' : 'text-ink-900',
          valueClassName,
        )}
        data-tabular
      >
        {value}
      </p>
      {note && (
        <p className={cn('mt-1.5 text-[0.8125rem]', highlight ? 'text-blue-200' : 'text-ink-500')}>
          {note}
        </p>
      )}
    </div>
  );
}

interface SummaryCardsProps {
  summary: AffiliateReferralsSummary;
  balanceCents: number;
}

/**
 * Os três números respondem, nesta ordem, "quanto eu vendi", "quanto isso me
 * rendeu" e "quanto ainda vou receber". O saldo não diz "disponível para saque":
 * neste programa não há saque — a Porto paga direto na chave cadastrada.
 */
export function SummaryCards({ summary, balanceCents }: SummaryCardsProps) {
  const services = summary.salesCount === 1 ? 'serviço vendido' : 'serviços vendidos';

  return (
    <div className="animate-rise mt-7 grid gap-4 sm:grid-cols-3">
      <Card
        highlight
        label="Vendas realizadas"
        value={formatBRL(summary.salesCents)}
        note={`${countFormatter.format(summary.salesCount)} ${services}`}
      />
      <Card
        label="Incentivos confirmados"
        value={formatBRL(summary.confirmedIncentiveCents)}
        valueClassName="text-[var(--status-approved)]"
        note="Das vendas com serviço concluído"
      />
      <Card
        label="Saldo da carteira"
        value={formatBRL(balanceCents)}
        note="A receber na sua chave PIX"
      />
    </div>
  );
}

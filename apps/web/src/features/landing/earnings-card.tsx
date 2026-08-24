import { Wallet } from 'lucide-react';
import { CountUp } from '@/components/count-up';
import { showcase } from '@/core/content/landing';
import { formatBRL } from '@/core/format';

/**
 * O extrato como ele vai ser, com valores de exemplo. É o objeto que responde
 * "e eu ganho o quê?" antes da pessoa ter que ler qualquer parágrafo — por isso
 * o selo de ilustrativo fica colado no saldo, e não numa nota lá embaixo.
 */
export function EarningsCard() {
  return (
    <div className="rounded-panel border border-white/20 bg-white p-6 shadow-float">
      <div className="flex items-center justify-between gap-3">
        <span className="text-eyebrow uppercase text-ink-400">{showcase.balanceLabel}</span>
        <Wallet className="size-4 text-blue-600" aria-hidden />
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <CountUp
          cents={showcase.totalCents}
          className="text-[2.5rem] font-extrabold leading-none tracking-[-0.035em] text-ink-900"
        />
        <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-500">
          {showcase.disclaimer}
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-ink-400">
        {/* O ponto pulsa devagar: é o que faz "agora" parecer agora. */}
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-pill bg-cyan-500 opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-pill bg-cyan-500" />
        </span>
        {showcase.freshness}
      </p>

      <ul className="mt-5 flex flex-col gap-2">
        {showcase.lines.map((line, index) => (
          <li
            key={line.label}
            className="animate-rise flex items-center justify-between gap-4 rounded-md border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-sm"
            style={{ animationDelay: `${420 + index * 110}ms` }}
          >
            <span className="text-ink-700">{line.label}</span>
            <span className="font-semibold text-[var(--status-approved)]" data-tabular>
              + {formatBRL(line.cents)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-dashed border-ink-200 pt-4 text-[0.8125rem] leading-snug text-ink-400">
        {showcase.note}
      </p>
    </div>
  );
}

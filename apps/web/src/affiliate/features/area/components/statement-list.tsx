import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { type AffiliateStatementEntry, StatementEntryKindEnum } from '@porto/contracts';
import { cn } from '@/shared/lib/cn';
import { formatBRL, formatDate } from '@/shared/lib/format';

/** Diz o que a linha é antes de dizer de onde ela veio: "Incentivo · Guincho 24h". */
const KIND_LABELS: Record<StatementEntryKindEnum, string> = {
  [StatementEntryKindEnum.INCENTIVE]: 'Incentivo',
  [StatementEntryKindEnum.PAYOUT]: 'Pagamento',
};

export function StatementList({ entries }: { entries: AffiliateStatementEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-panel border border-dashed border-ink-300 bg-white px-6 py-10 text-center text-[0.9375rem] text-ink-500">
        Nenhuma movimentação ainda. Assim que uma venda com o seu cupom for concluída, ela aparece
        aqui.
      </p>
    );
  }

  return (
    /*
      Uma coluna, sempre. A grade de duas colunas da referência espreme cada
      linha a ponto de "Serviços Automotivos" não caber ao lado do valor — e a
      solução dela é cortar o texto, que é justamente o que não pode acontecer
      num extrato: linha cortada é linha que a pessoa não confere.
    */
    <ul className="reveal-stagger flex flex-col gap-2">
      {entries.map((entry) => {
        const isIncentive = entry.kind === StatementEntryKindEnum.INCENTIVE;
        const Icon = isIncentive ? ArrowDownLeft : ArrowUpRight;

        return (
          <li
            key={entry.id}
            className="group flex items-start gap-3.5 rounded-panel border border-ink-200 bg-white p-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-card"
          >
            <span
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-card transition-transform duration-200 group-hover:scale-105',
                isIncentive
                  ? 'bg-[var(--status-approved-surface)] text-[var(--status-approved)]'
                  : 'bg-blue-50 text-blue-600',
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>

            {/*
              `flex-wrap` no lugar de `truncate`: quando o título e o valor não
              couberem na mesma linha, o valor desce inteiro em vez de comer o
              título. O valor e a data levam `whitespace-nowrap` para nunca
              quebrarem no meio do número.
            */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="font-semibold text-ink-900">{entry.title}</span>
                <span
                  className={cn(
                    'whitespace-nowrap font-semibold',
                    isIncentive ? 'text-[var(--status-approved)]' : 'text-ink-700',
                  )}
                  data-tabular
                >
                  {/*
                    O sinal vem do `kind`, nunca do sinal do número: o extrato
                    guarda valor absoluto, e deixar a tela adivinhar pelo sinal
                    é como um estorno aparece como crédito.
                  */}
                  {isIncentive ? '+' : '−'} {formatBRL(entry.cents)}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[0.8125rem] text-ink-500">
                <span>
                  {KIND_LABELS[entry.kind]} · {entry.detail}
                </span>
                <span className="whitespace-nowrap" data-tabular>
                  {formatDate(entry.occurredAt)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

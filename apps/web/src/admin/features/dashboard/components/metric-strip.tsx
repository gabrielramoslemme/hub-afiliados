import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatBRL } from '@/shared/lib/format';
import { headline } from '../mock-data';
import { Panel } from './panel';

const salesFormatter = new Intl.NumberFormat('pt-BR');

function Metric({ label, value, note }: { label: string; value: string; note: ReactNode }) {
  return (
    <div className="p-5">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-2 text-[1.75rem] font-bold leading-tight text-ink-900" data-tabular>
        {value}
      </p>
      <p className="mt-2 text-[0.8125rem] font-semibold" data-tabular>
        {note}
      </p>
    </div>
  );
}

/** O crescimento é sempre lido junto do valor: número sozinho não diz se é bom. */
function Growth({ percent }: { percent: number }) {
  return (
    <span className={cn(percent >= 0 ? 'text-[var(--status-approved)]' : 'text-destructive')}>
      {percent >= 0 ? '+' : ''}
      {percent}% este mês
    </span>
  );
}

/**
 * Os três números que respondem "como o programa vai" moram numa peça só,
 * separados por fio. Como três cartões soltos eles competiam com o cartão de
 * saque com falha, que é a coisa menos importante da tela: caixa igual pesa
 * igual, e hierarquia se faz agrupando, não aumentando fonte.
 */
export function MetricStrip() {
  return (
    <Panel className="grid divide-y divide-ink-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Metric
        label="Faturamento bruto"
        value={formatBRL(headline.grossRevenueCents)}
        note={<Growth percent={headline.revenueGrowthPercent} />}
      />
      <Metric
        label="Comissões pagas"
        value={formatBRL(headline.paidCommissionsCents)}
        note={
          <span className="text-blue-600">
            {formatBRL(headline.pendingCommissionsCents)} pendente
          </span>
        }
      />
      <Metric
        label="Total de vendas"
        value={salesFormatter.format(headline.totalSales)}
        note={<Growth percent={headline.salesGrowthPercent} />}
      />
    </Panel>
  );
}

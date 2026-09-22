'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart';
import { formatBRL } from '@/shared/lib/format';
import type { TrendPoint } from '../lib/mock-data';

/**
 * A cor da série sai do token, e o `var(--color-<série>)` que o traço lê é o que
 * o `ChartContainer` publica a partir daqui. Azul é o que a Porto fatura, verde
 * é o que o afiliado recebe — o mesmo par que a métrica e o status usam.
 */
const CONFIG = {
  sales: { label: 'Vendas', color: 'var(--color-chart-1)' },
  commissions: { label: 'Comissões', color: 'var(--color-chart-2)' },
} satisfies ChartConfig;

/** O eixo mostra a ordem de grandeza; o valor exato fica na dica do ponto. */
const axisFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function SalesTrendChart({ points }: { points: TrendPoint[] }) {
  const data = points.map((point) => ({
    month: point.month,
    sales: point.salesCents,
    commissions: point.commissionsCents,
  }));

  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-[17rem] w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(value: number) => axisFormatter.format(value / 100)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {CONFIG[name as keyof typeof CONFIG]?.label ?? name}
                  </span>
                  <span className="font-semibold text-foreground" data-tabular>
                    {formatBRL(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Line
          dataKey="sales"
          type="monotone"
          stroke="var(--color-sales)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          dataKey="commissions"
          type="monotone"
          stroke="var(--color-commissions)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
}

'use client';

import { Pie, PieChart } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart';
import type { CategorySlice } from '../mock-data';

/**
 * Quatro tons na ordem da escala. A rosca não tem eixo nem rótulo dentro dela,
 * então distinguir uma fatia da vizinha é toda a informação que a cor carrega —
 * por isso a escala vai de azul a cinza, e não de azul a azul.
 */
const SLICE_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
];

function sliceColor(index: number): string {
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

export function CategoryChart({ slices }: { slices: CategorySlice[] }) {
  const data = slices.map((slice, index) => ({
    category: slice.category,
    share: slice.sharePercent,
    fill: sliceColor(index),
  }));

  const config = Object.fromEntries(
    slices.map((slice) => [slice.category, { label: slice.category }]),
  ) satisfies ChartConfig;

  return (
    <div>
      <ChartContainer config={config} className="mx-auto aspect-square h-[15rem]">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="category"
                hideLabel
                formatter={(value, name) => (
                  <div className="flex flex-1 items-center justify-between gap-4">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-semibold text-foreground" data-tabular>
                      {value}%
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="share"
            nameKey="category"
            innerRadius="58%"
            outerRadius="90%"
            paddingAngle={2}
            strokeWidth={0}
          />
        </PieChart>
      </ChartContainer>

      {/*
        A legenda é escrita aqui, e não pelo `ChartLegendContent`: o desenho pede
        a fatia e a porcentagem no mesmo rótulo, e ler "40%" ao lado do nome é o
        que dispensa passar o ponteiro sobre a rosca.
      */}
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {slices.map((slice, index) => (
          <li key={slice.category} className="flex items-center gap-2 text-sm text-ink-700">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: sliceColor(index) }}
              aria-hidden
            />
            <span data-tabular>
              {slice.category} — {slice.sharePercent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

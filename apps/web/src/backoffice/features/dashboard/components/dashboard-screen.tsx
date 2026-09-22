import type { ReactNode } from 'react';
import { categoryMix, currentPeriod, monthlyTrend, trendPeriod } from '../lib/mock-data';
import { BaseComposition } from './base-composition';
import { CategoryChart } from './category-chart';
import { MetricStrip } from './metric-strip';
import { DashboardHeader } from './page-header';
import { Panel } from './panel';
import { PerformancePanel } from './performance-panel';
import { SalesTrendChart } from './sales-trend-chart';
import { TopAffiliates } from './top-affiliates';

/** A ordem de grandeza cabe no cabeçalho; o valor exato fica no próprio gráfico. */
const compactBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Sobrelinha em vez de título de seção. O painel tem quatro blocos e nenhum
 * deles é uma página: uma linha de rótulo dá nome ao grupo sem competir com o
 * `h1` nem com os números, que é o que um `h2` do tamanho de título fazia.
 */
function SectionHeading({ children, aside }: { children: string; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-eyebrow uppercase text-ink-400">{children}</h2>
      {aside}
    </div>
  );
}

function ChartHeading({
  title,
  subtitle,
  statLabel,
  stat,
}: {
  title: string;
  subtitle: string;
  statLabel: string;
  stat: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>
      </div>

      {/* O canto do cabeçalho era espaço vazio; agora responde de relance a
          pergunta que o gráfico só responde depois de lido. */}
      <div className="text-right">
        <p className="text-eyebrow uppercase text-ink-400">{statLabel}</p>
        <p className="mt-1 text-sm font-semibold text-ink-900" data-tabular>
          {stat}
        </p>
      </div>
    </div>
  );
}

/**
 * A tela inicial do painel. Tudo aqui é Server Component lendo `mock-data.ts`;
 * só os dois gráficos são ilha de cliente, porque o recharts mede o container
 * para desenhar. Quando as leituras existirem, o que muda é a origem do dado —
 * a montagem continua igual.
 *
 * A tela inteira nasce acima da dobra, então o movimento é por tempo e não pela
 * timeline de rolagem: `view()` mediria a posição de blocos que já estão na
 * tela, e todos nasceriam no estado final.
 */
export function DashboardScreen() {
  const trendTotalCents = monthlyTrend.reduce((total, point) => total + point.salesCents, 0);
  const biggestSlice = categoryMix.reduce((biggest, slice) =>
    slice.sharePercent > biggest.sharePercent ? slice : biggest,
  );

  return (
    <>
      <div className="animate-rise">
        <DashboardHeader />
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <section className="animate-rise [animation-delay:60ms]">
          <SectionHeading>Resultado</SectionHeading>
          <MetricStrip />
        </section>

        <section className="animate-rise [animation-delay:120ms]">
          <SectionHeading>Base de afiliados</SectionHeading>

          {/* A composição ocupa mais largura que a coluna ao lado: é leitura de
              gráfico, e a outra é meta mais uma pilha de ações curtas. */}
          <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
            <BaseComposition />
            <PerformancePanel />
          </div>
        </section>

        <section className="animate-rise [animation-delay:180ms]">
          <SectionHeading>Tendência e segmentação</SectionHeading>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-5">
              <ChartHeading
                title="Evolução de Vendas vs. Comissões"
                subtitle={`Comparativo mensal (${trendPeriod})`}
                statLabel="Total do período"
                stat={compactBRL.format(trendTotalCents / 100)}
              />
              <SalesTrendChart points={monthlyTrend} />
            </Panel>

            <Panel className="p-5">
              <ChartHeading
                title="Volume por categoria de prestador"
                subtitle="Distribuição por segmento"
                statLabel="Maior fatia"
                stat={`${biggestSlice.category} · ${biggestSlice.sharePercent}%`}
              />
              <CategoryChart slices={categoryMix} />
            </Panel>
          </div>
        </section>

        <section className="animate-rise [animation-delay:240ms]">
          <SectionHeading
            aside={<span className="text-xs font-semibold text-ink-500">{currentPeriod}</span>}
          >
            Ranking dos melhores afiliados
          </SectionHeading>
          <TopAffiliates />
        </section>
      </div>
    </>
  );
}

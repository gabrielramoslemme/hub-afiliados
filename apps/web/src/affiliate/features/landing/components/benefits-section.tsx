import { Banknote, Percent, ReceiptText, Ticket, Wallet } from 'lucide-react';
import { Container, SectionHeading } from '@/affiliate/shared/components/section';
import { benefits, pitch } from '@/affiliate/shared/content';
import { cn } from '@/shared/lib/cn';

const ICONS = [ReceiptText, Banknote, Percent, Wallet];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="py-24">
      <Container>
        <SectionHeading eyebrow={benefits.eyebrow} title={benefits.title} className="reveal" />

        {/* Bento: o destaque ocupa duas colunas e duas linhas, o resto acompanha. */}
        <div className="reveal-stagger mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="flex flex-col rounded-panel border border-blue-200 bg-blue-50 p-8 sm:col-span-2 lg:row-span-2">
            <Ticket className="size-7 text-blue-600" aria-hidden />
            <h3 className="mt-7 text-2xl font-bold tracking-[-0.02em] text-ink-900">
              {benefits.highlight.title}
            </h3>
            <p className="text-lead mt-3 max-w-[42ch] text-ink-500">
              {benefits.highlight.description}
            </p>

            {/* Ancorar o exemplo no rodapé fecha o card sem deixar ar no meio. */}
            <div className="mt-auto flex items-baseline gap-3 border-t border-blue-200 pt-8">
              <span className="text-eyebrow uppercase text-ink-400">Exemplo</span>
              <span
                className="font-mono text-sm font-semibold tracking-[0.08em] text-blue-700"
                data-tabular
              >
                {pitch.sampleCoupon}
              </span>
            </div>
          </article>

          {benefits.items.map((item, index) => {
            const Icon = ICONS[index];

            return (
              <article
                key={item.title}
                className={cn(
                  'group rounded-panel border border-ink-200 bg-white p-6',
                  'transition-[transform,border-color,box-shadow] duration-200',
                  'hover:-translate-y-1 hover:border-blue-300 hover:shadow-card',
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-card bg-blue-50 text-blue-600 transition-colors duration-200 group-hover:bg-blue-100">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-semibold tracking-[-0.01em] text-ink-900">{item.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-500">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

import { MessageCircle, Tag } from 'lucide-react';
import { pitch } from '@/core/content/landing';
import { Container, SectionHeading } from './section';
import { Typewriter } from './typewriter';

export function PitchSection() {
  return (
    <section className="border-y border-blue-200 bg-blue-50 py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className="reveal">
          <SectionHeading eyebrow={pitch.eyebrow} title={pitch.title} lead={pitch.lead} />

          <figure className="mt-10 border-l-2 border-cyan-500 pl-6">
            <blockquote className="text-lead text-ink-700">“{pitch.quote}”</blockquote>
          </figure>
        </div>

        {/*
          Reprodução do campo de cupom do checkout da Porto. O código é digitado
          quando a seção entra na tela: a pessoa vê exatamente o gesto que vai
          pedir ao cliente, em vez de ler a descrição dele.
        */}
        <div className="reveal-pop rounded-panel border border-ink-200 bg-white p-7 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <p className="text-eyebrow uppercase text-ink-400">Checkout da Porto</p>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-[var(--status-approved-surface)] px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--status-approved)]">
              <span
                className="size-1.5 animate-pulse rounded-pill bg-[var(--status-approved)]"
                aria-hidden
              />
              Cupom ativo
            </span>
          </div>

          <p className="mt-6 block text-sm font-medium text-ink-700">Cupom de desconto</p>

          <div className="mt-2 flex items-center gap-2 rounded-md border border-blue-400 bg-white px-3.5 py-3 ring-[3px] ring-blue-600/15">
            <Tag className="size-4 shrink-0 text-blue-600" aria-hidden />
            <Typewriter
              text={pitch.sampleCoupon}
              className="font-mono text-[0.9375rem] font-semibold tracking-[0.06em] text-ink-900"
              caretClassName="bg-blue-600"
            />
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-dashed border-ink-200 pt-5 text-sm">
            <span className="text-ink-500">Indicação registrada para</span>
            <span className="font-semibold text-ink-900">você</span>
          </div>

          {/*
            As frases prontas vêm depois do campo, e não antes: primeiro a pessoa
            entende o que precisa acontecer na tela do cliente, depois recebe o
            texto para pedir isso.
          */}
          <div className="mt-7 border-t border-ink-200 pt-6">
            <p className="text-eyebrow uppercase text-ink-400">{pitch.phrasesLabel}</p>

            <ul className="reveal-stagger mt-4 flex flex-col gap-3">
              {pitch.phrases.map((phrase) => (
                <li key={phrase} className="flex items-start gap-2.5 text-[0.9375rem] text-ink-700">
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
                  <span>“{phrase}”</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-[0.8125rem] leading-snug text-ink-400">{pitch.note}</p>
        </div>
      </Container>
    </section>
  );
}

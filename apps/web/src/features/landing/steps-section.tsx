import { steps } from '@/core/content/landing';
import { Container, SectionHeading } from './section';

export function StepsSection() {
  return (
    <section id="como-funciona" className="border-y border-ink-200 bg-ink-50 py-24">
      <Container>
        <SectionHeading eyebrow={steps.eyebrow} title={steps.title} className="reveal" />

        <div className="relative mt-16">
          {/*
            O trilho se preenche conforme a seção sobe na tela — a leitura é que
            avança os passos, não um temporizador. Sem suporte a `view()` ele
            nasce inteiro, que é a leitura correta de uma régua.
          */}
          <span
            aria-hidden
            className="draw-line absolute inset-x-0 -top-8 h-px bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-200"
          />

          <ol className="reveal-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.items.map((step, index) => (
              <li
                key={step.title}
                className="group rounded-panel border border-ink-200 bg-white p-6 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-card"
              >
                {/*
                  O número é marca d'água e não informação: fica em opacidade
                  baixa, aria-hidden, e a ordem real quem dá é o `<ol>`.
                */}
                <span
                  aria-hidden
                  data-tabular
                  className="block text-[2.75rem] font-extrabold leading-none tracking-[-0.05em] text-blue-600/15 transition-colors duration-200 group-hover:text-blue-600/30"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <h3 className="mt-5 text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-500">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

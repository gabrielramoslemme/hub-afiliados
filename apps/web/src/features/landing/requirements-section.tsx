import { requirements } from '@/core/content/landing';
import { Container, SectionHeading } from './section';

/**
 * O traço do check é riscado conforme a lista entra na tela. Fica como SVG
 * local, e não como ícone do lucide, porque a animação precisa alcançar o
 * `path` — no componente pronto só o `svg` externo aceita classe.
 */
function DrawnCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path className="draw-check" d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function RequirementsSection() {
  return (
    <section id="requisitos" className="py-24">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="reveal lg:col-span-5">
          <SectionHeading
            eyebrow={requirements.eyebrow}
            title={requirements.title}
            lead={requirements.lead}
          />
        </div>

        <div className="lg:col-span-7">
          <ul className="reveal-stagger divide-y divide-ink-200 overflow-hidden rounded-panel border border-ink-200 bg-white">
            {requirements.items.map((item) => (
              <li key={item} className="flex items-start gap-4 px-6 py-5">
                <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-pill bg-blue-50 text-blue-600">
                  <DrawnCheck />
                </span>
                <p className="text-[0.9375rem] leading-relaxed text-ink-700">{item}</p>
              </li>
            ))}
          </ul>

          <p className="reveal mt-6 text-[0.8125rem] leading-relaxed text-ink-500">
            {requirements.note}
          </p>
        </div>
      </Container>
    </section>
  );
}

import { Check, Lock } from 'lucide-react';
import { Container, SectionHeading } from '@/affiliate/shared/components/section';
import { registration, steps } from '@/affiliate/shared/content';
import { RegistrationForm } from './registration-form';

export function RegistrationSection({ autoFocus = false }: { autoFocus?: boolean } = {}) {
  return (
    <section id="cadastro" className="border-t border-blue-200 bg-blue-50 py-24">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="reveal lg:col-span-5">
          <SectionHeading
            eyebrow={registration.eyebrow}
            title={registration.title}
            lead={registration.lead}
          />

          {/* Os três selos respondem o que trava a pessoa antes do primeiro campo. */}
          <ul className="mt-8 flex flex-wrap gap-2">
            {registration.marks.map((mark) => (
              <li
                key={mark}
                className="inline-flex items-center gap-1.5 rounded-pill border border-blue-200 bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-blue-700"
              >
                <Check className="size-3.5 text-blue-600" aria-hidden />
                {mark}
              </li>
            ))}
          </ul>

          <ol className="mt-10 flex flex-col gap-5 border-t border-blue-200 pt-8">
            {steps.items.slice(0, 3).map((step, index) => (
              <li key={step.title} className="flex items-baseline gap-4">
                <span className="text-sm font-semibold text-blue-400" data-tabular aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-[0.9375rem] text-ink-700">{step.title}</span>
              </li>
            ))}
          </ol>

          <p className="mt-10 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-500">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden />
            {registration.lgpd}
          </p>
        </div>

        <div className="reveal-pop lg:col-span-7">
          <div className="rounded-panel border border-ink-200 bg-white p-7 shadow-card sm:p-9">
            <RegistrationForm autoFocus={autoFocus} />
          </div>
        </div>
      </Container>
    </section>
  );
}

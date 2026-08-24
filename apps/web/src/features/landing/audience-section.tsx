import { Building2, Home, Users, Video } from 'lucide-react';
import { audience } from '@/core/content/landing';
import { Container, SectionHeading } from './section';

const ICONS = [Building2, Video, Home, Users];

export function AudienceSection() {
  return (
    <section id="para-quem-e" className="py-24">
      <Container>
        <SectionHeading
          eyebrow={audience.eyebrow}
          title={audience.title}
          lead={audience.lead}
          className="reveal"
        />

        {/*
          Lista editorial com fio de 1px, não grade de cards iguais: o ritmo
          precisa mudar do bloco anterior, e quatro caixas idênticas são o
          contrário disso.
        */}
        <ul className="reveal-stagger mt-14 grid gap-x-14 border-t border-ink-200 sm:grid-cols-2">
          {audience.profiles.map((profile, index) => {
            const Icon = ICONS[index];

            return (
              <li key={profile.title} className="border-b border-ink-200 py-8">
                <div className="flex items-start gap-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
                  <div>
                    <h3 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink-900">
                      {profile.title}
                    </h3>
                    <p className="mt-2 max-w-[46ch] leading-relaxed text-ink-500">
                      {profile.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

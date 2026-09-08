import { Container, SectionHeading } from '@/affiliate/shared/components/section';
import { about, hasAbout } from '@/affiliate/shared/content';

/**
 * "Quem somos nós", pedida pela Porto na validação de 04/09/2026 — com o texto
 * marcado como TBD no mesmo documento. Sem os parágrafos a seção não é montada:
 * um bloco com título e nada embaixo é pior do que a página sem ele. Assim que
 * `about` for preenchido em `content.ts`, ela e o item do menu voltam sozinhos.
 */
export function AboutSection() {
  if (!hasAbout) return null;

  return (
    <section id="quem-somos" className="border-y border-ink-200 bg-ink-50 py-24">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="reveal lg:col-span-5">
          <SectionHeading eyebrow={about.eyebrow} title={about.title} />
        </div>

        <div className="reveal-stagger flex flex-col gap-5 lg:col-span-7">
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-lead max-w-[58ch] text-ink-500">
              {paragraph}
            </p>
          ))}
        </div>
      </Container>
    </section>
  );
}

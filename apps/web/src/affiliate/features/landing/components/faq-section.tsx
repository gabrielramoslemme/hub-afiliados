import { Container, SectionHeading } from '@/affiliate/shared/components/section';
import { faq } from '@/affiliate/shared/content';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';

export function FaqSection() {
  return (
    <section id="duvidas" className="border-y border-ink-200 bg-ink-50 py-24">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="reveal lg:col-span-5">
          <SectionHeading eyebrow={faq.eyebrow} title={faq.title} />
        </div>

        <div className="reveal lg:col-span-7">
          <Accordion type="single" collapsible className="border-t border-ink-200">
            {faq.items.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  );
}

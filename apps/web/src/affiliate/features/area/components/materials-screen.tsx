import { ImageIcon, MessageCircle } from 'lucide-react';
import { pitch } from '@/affiliate/shared/content';
import { Badge } from '@/shared/components/ui/badge';
import { PageHeading } from './page-heading';

export function MaterialsScreen() {
  return (
    <>
      <PageHeading title="Materiais" lead="O que usar para divulgar o seu cupom." />

      <div className="mt-7 grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="rounded-panel border border-ink-200 bg-white p-6">
          <h2 className="text-eyebrow uppercase text-ink-400">{pitch.phrasesLabel}</h2>

          <ul className="mt-4 flex flex-col gap-3">
            {pitch.phrases.map((phrase) => (
              <li key={phrase} className="flex items-start gap-2.5 text-[0.9375rem] text-ink-700">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
                <span>“{phrase}”</span>
              </li>
            ))}
          </ul>
        </section>

        {/*
          As peças para baixar são o RF-16, fora da Onda 1. O bloco fica para a
          pessoa saber que elas vêm, e não oferece clique: um download que não
          baixa nada é pior do que a ausência dele.
        */}
        <section className="flex items-start gap-3.5 rounded-panel border border-dashed border-ink-300 bg-white p-6">
          <ImageIcon className="mt-0.5 size-5 shrink-0 text-ink-400" aria-hidden />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-ink-900">Peças e banners</h2>
              <Badge tone="brand">Em breve</Badge>
            </div>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
              As peças de divulgação da Porto Serviço, prontas para postar, vão ficar aqui para você
              baixar.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

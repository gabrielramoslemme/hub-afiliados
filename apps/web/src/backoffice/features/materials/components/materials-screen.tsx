import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { fetchPromotionalMaterials, fetchTrainingModules } from '../data';
import { NewPromotionalMaterialButton, NewTrainingModuleButton } from './material-actions';
import { PromotionalMaterialList, TrainingModuleList } from './material-lists';

/**
 * O que o afiliado vê na aba Materiais, do lado de quem cadastra: a trilha de
 * formação e os arquivos para baixar. Vídeo e arquivo ficam onde a Porto os
 * hospeda — aqui entra o endereço. A ordem muda arrastando a lista pela alça.
 *
 * A tela nasce acima da dobra, então o movimento é por tempo, não pela timeline
 * de rolagem.
 */
export async function MaterialsScreen() {
  const [modules, materials] = await Promise.all([
    fetchTrainingModules(),
    fetchPromotionalMaterials(),
  ]);

  return (
    <>
      <div className="animate-rise">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink-900">Materiais</h1>
        <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-ink-500">
          A trilha de formação e os arquivos de divulgação da aba Materiais do afiliado. O que for
          salvo aqui aparece para todos os afiliados na hora.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start">
        <Panel
          title="Trilha de formação"
          lead="Os vídeos que o afiliado assiste e marca como concluídos. Arraste pela alça para mudar a ordem."
          action={<NewTrainingModuleButton />}
          className="animate-rise [animation-delay:60ms]"
        >
          <TrainingModuleList modules={modules} />
        </Panel>

        <Panel
          title="Downloads"
          lead="Arquivos prontos para o afiliado usar nas campanhas."
          action={<NewPromotionalMaterialButton />}
          className="animate-rise [animation-delay:120ms]"
        >
          <PromotionalMaterialList materials={materials} />
        </Panel>
      </div>
    </>
  );
}

function Panel({
  title,
  lead,
  action,
  className,
  children,
}: {
  title: string;
  lead: string;
  action: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('rounded-panel border border-ink-200 bg-white', className)}>
      <header className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-ink-900">{title}</h2>
          <p className="mt-0.5 text-[0.875rem] text-ink-500">{lead}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </header>
      {children}
    </section>
  );
}

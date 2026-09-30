import { Clock, ExternalLink, FileDown, PlayCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminPromotionalMaterial, AdminTrainingModule } from '@porto/contracts';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/cn';
import { formatFileSize } from '@/shared/lib/format';
import { fetchPromotionalMaterials, fetchTrainingModules } from '../data';
import { nextPosition } from '../lib/material-form';
import {
  NewPromotionalMaterialButton,
  NewTrainingModuleButton,
  PromotionalMaterialRowActions,
  TrainingModuleRowActions,
} from './material-actions';

/**
 * O que o afiliado vê na aba Materiais, do lado de quem cadastra: a trilha de
 * formação e os arquivos para baixar. Vídeo e arquivo ficam onde a Porto os
 * hospeda — aqui entra o endereço.
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
          lead="Os vídeos que o afiliado assiste e marca como concluídos, na ordem da posição."
          action={<NewTrainingModuleButton nextPosition={nextPosition(modules)} />}
          className="animate-rise [animation-delay:60ms]"
        >
          {modules.length === 0 ? (
            <EmptyState>
              Nenhum módulo ainda. A trilha aparece para o afiliado assim que o primeiro for
              adicionado.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-ink-200">
              {modules.map((module) => (
                <TrainingModuleRow key={module.id} module={module} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Downloads"
          lead="Arquivos prontos para o afiliado usar nas campanhas."
          action={<NewPromotionalMaterialButton nextPosition={nextPosition(materials)} />}
          className="animate-rise [animation-delay:120ms]"
        >
          {materials.length === 0 ? (
            <EmptyState>Nenhum arquivo ainda.</EmptyState>
          ) : (
            <ul className="divide-y divide-ink-200">
              {materials.map((material) => (
                <PromotionalMaterialRow key={material.id} material={material} />
              ))}
            </ul>
          )}
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

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-[0.9375rem] text-ink-500">{children}</p>;
}

function TrainingModuleRow({ module }: { module: AdminTrainingModule }) {
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-pill bg-blue-50 text-sm font-semibold text-blue-700"
        data-tabular
        title="Posição na trilha"
      >
        {module.position}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">{module.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[0.875rem] text-ink-500">{module.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {module.durationMinutes} min
          </span>
          <ExternalAddress
            href={module.videoUrl}
            icon={<PlayCircle className="size-3.5" aria-hidden />}
          />
        </div>
      </div>

      <TrainingModuleRowActions module={module} />
    </li>
  );
}

function PromotionalMaterialRow({ material }: { material: AdminPromotionalMaterial }) {
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">{material.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[0.875rem] text-ink-500">{material.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-500">
          <Badge>{material.fileFormat}</Badge>
          <span data-tabular>{formatFileSize(material.fileSizeBytes)}</span>
          <span data-tabular>Posição {material.position}</span>
          <ExternalAddress
            href={material.fileUrl}
            icon={<FileDown className="size-3.5" aria-hidden />}
          />
        </div>
      </div>

      <PromotionalMaterialRowActions material={material} />
    </li>
  );
}

/** O endereço cadastrado, para o operador conferir que abre o que deveria. */
function ExternalAddress({ href, icon }: { href: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium text-blue-600 hover:underline"
    >
      {icon}
      <span className="truncate">{new URL(href).hostname}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

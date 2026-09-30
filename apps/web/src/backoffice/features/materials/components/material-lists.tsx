'use client';

import { Clock, ExternalLink, FileDown, PlayCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminPromotionalMaterial, AdminTrainingModule } from '@porto/contracts';
import { Badge } from '@/shared/components/ui/badge';
import { VideoCover } from '@/shared/components/video-cover';
import { formatFileSize } from '@/shared/lib/format';
import type { ResolvedVideoThumbnail } from '@/shared/lib/video';
import { reorderPromotionalMaterials } from '../actions/promotional-material.action';
import { reorderTrainingModules } from '../actions/training-module.action';
import { PromotionalMaterialRowActions, TrainingModuleRowActions } from './material-actions';
import { SortableList } from './sortable-list';

/*
  As duas listas da tela. São cliente inteiras porque arrastar precisa do
  estado da ordem na mão; o resto da tela continua Server Component.
*/

export function TrainingModuleList({
  modules,
  thumbnails,
}: {
  modules: AdminTrainingModule[];
  /** A capa de cada módulo, por id, resolvida no servidor. */
  thumbnails: Record<string, ResolvedVideoThumbnail>;
}) {
  if (modules.length === 0) {
    return (
      <EmptyState>
        Nenhum módulo ainda. A trilha aparece para o afiliado assim que o primeiro for adicionado.
      </EmptyState>
    );
  }

  return (
    <SortableList
      items={modules}
      onReorder={reorderTrainingModules}
      renderItem={(module, index) => (
        <>
          <PositionBadge position={index + 1} />
          <VideoCover
            thumbnail={thumbnails[module.id] ?? { kind: 'none' }}
            className="hidden w-28 sm:flex"
          />
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
        </>
      )}
    />
  );
}

export function PromotionalMaterialList({ materials }: { materials: AdminPromotionalMaterial[] }) {
  if (materials.length === 0) return <EmptyState>Nenhum arquivo ainda.</EmptyState>;

  return (
    <SortableList
      items={materials}
      onReorder={reorderPromotionalMaterials}
      renderItem={(material, index) => (
        <>
          <PositionBadge position={index + 1} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900">{material.title}</p>
            <p className="mt-0.5 line-clamp-2 text-[0.875rem] text-ink-500">
              {material.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-500">
              <Badge>{material.fileFormat}</Badge>
              <span data-tabular>{formatFileSize(material.fileSizeBytes)}</span>
              <ExternalAddress
                href={material.fileUrl}
                icon={<FileDown className="size-3.5" aria-hidden />}
              />
            </div>
          </div>
          <PromotionalMaterialRowActions material={material} />
        </>
      )}
    />
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-[0.9375rem] text-ink-500">{children}</p>;
}

/** A posição que o afiliado vê. Sai da ordem da lista, e por isso acompanha o arrasto. */
function PositionBadge({ position }: { position: number }) {
  return (
    <span
      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-pill bg-blue-50 text-sm font-semibold text-blue-700"
      data-tabular
    >
      {position}
      <span className="sr-only">ª posição</span>
    </span>
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

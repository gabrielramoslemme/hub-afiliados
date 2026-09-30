'use client';

import { Clock, ExternalLink, FileDown, PlayCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminPromotionalMaterial, AdminTrainingModule } from '@porto/contracts';
import { FileFormatIcon } from '@/shared/components/file-format-icon';
import { formatFileSize } from '@/shared/lib/format';
import type { ResolvedVideoThumbnail } from '@/shared/lib/video';
import { reorderPromotionalMaterials } from '../actions/promotional-material.action';
import { reorderTrainingModules } from '../actions/training-module.action';
import { PromotionalMaterialRowActions, TrainingModuleRowActions } from './material-actions';
import { SortableList } from './sortable-list';
import { VideoPreview } from './video-preview-dialog';

/*
  As duas listas da tela. São cliente inteiras porque arrastar precisa do
  estado da ordem na mão; o resto da tela continua Server Component.

  A linha responde ao cursor em camadas: o fundo clareia, a alça e as ações
  ganham contraste, o número e o link acendem na cor da marca. Nada muda de
  lugar — o hover só diz "isto aqui é mexível".
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
          <VideoPreview module={module} thumbnail={thumbnails[module.id] ?? { kind: 'none' }} />
          <ItemText
            title={module.title}
            description={module.description}
            meta={
              <>
                {/* Com a capa na tela, a duração já está no selo dela. */}
                <span className="inline-flex items-center gap-1.5 sm:hidden">
                  <Clock className="size-3.5" aria-hidden />
                  {module.durationMinutes} min
                </span>
                <ExternalAddress
                  href={module.videoUrl}
                  icon={<PlayCircle className="size-3.5" aria-hidden />}
                />
              </>
            }
          />
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
          <FileFormatIcon format={material.fileFormat} />
          <ItemText
            title={material.title}
            description={material.description}
            meta={
              <>
                <span className="font-semibold text-ink-700">{material.fileFormat}</span>
                <span data-tabular>{formatFileSize(material.fileSizeBytes)}</span>
                <ExternalAddress
                  href={material.fileUrl}
                  icon={<FileDown className="size-3.5" aria-hidden />}
                />
              </>
            }
          />
          <PromotionalMaterialRowActions material={material} />
        </>
      )}
    />
  );
}

function ItemText({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta: ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1 pt-0.5">
      <p className="truncate font-semibold text-ink-900" title={title}>
        {title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-500">
        {description}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-500">
        {meta}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-[0.9375rem] text-ink-500">{children}</p>;
}

/** A posição que o afiliado vê. Sai da ordem da lista, e por isso acompanha o arrasto. */
function PositionBadge({ position }: { position: number }) {
  return (
    <span
      className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-pill bg-ink-100 text-[0.75rem] font-semibold text-ink-700 transition-colors duration-200 group-hover/row:bg-blue-50 group-hover/row:text-blue-700"
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
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium underline-offset-2 transition-colors duration-200 hover:underline group-hover/row:text-blue-600"
    >
      {icon}
      <span className="truncate">{new URL(href).hostname}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

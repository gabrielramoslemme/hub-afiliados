'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AdminPromotionalMaterial, AdminTrainingModule } from '@porto/contracts';
import { Button } from '@/shared/components/ui/button';
import { deletePromotionalMaterial } from '../actions/promotional-material.action';
import { deleteTrainingModule } from '../actions/training-module.action';
import { DeleteMaterialDialog } from './delete-material-dialog';
import { PromotionalMaterialDialog } from './promotional-material-dialog';
import { TrainingModuleDialog } from './training-module-dialog';

/*
  Nas telas com ponteiro, os botões da linha ficam discretos até o cursor
  chegar nela. No toque não há hover para revelá-los, e no teclado o foco
  dentro da linha os traz de volta — em nenhum dos dois eles somem.
*/
const ROW_ACTIONS =
  'flex shrink-0 items-center gap-0.5 transition-opacity duration-200 [@media(hover:hover)]:opacity-40 group-hover/row:opacity-100 group-focus-within/row:opacity-100';

/*
  As ilhas de cliente da tela: cada botão guarda o estado do próprio diálogo, e
  a lista em volta continua Server Component.
*/

export function NewTrainingModuleButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Novo módulo
      </Button>
      <TrainingModuleDialog module={null} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function TrainingModuleRowActions({ module }: { module: AdminTrainingModule }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className={ROW_ACTIONS}>
      <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        <span className="sr-only">Editar {module.title}</span>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="Apagar"
        className="hover:bg-[var(--status-rejected-surface)] hover:text-[var(--status-rejected)]"
        onClick={() => setDeleting(true)}
      >
        <Trash2 aria-hidden />
        <span className="sr-only">Apagar {module.title}</span>
      </Button>

      <TrainingModuleDialog module={module} open={editing} onOpenChange={setEditing} />
      <DeleteMaterialDialog
        title={`Apagar “${module.title}”?`}
        description="O módulo sai da trilha de todos os afiliados, e o registro de quem já o assistiu vai junto."
        successMessage="Módulo apagado."
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={() => deleteTrainingModule(module.id)}
      />
    </div>
  );
}

export function NewPromotionalMaterialButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Novo material
      </Button>
      <PromotionalMaterialDialog material={null} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function PromotionalMaterialRowActions({
  material,
}: {
  material: AdminPromotionalMaterial;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className={ROW_ACTIONS}>
      <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        <span className="sr-only">Editar {material.title}</span>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="Apagar"
        className="hover:bg-[var(--status-rejected-surface)] hover:text-[var(--status-rejected)]"
        onClick={() => setDeleting(true)}
      >
        <Trash2 aria-hidden />
        <span className="sr-only">Apagar {material.title}</span>
      </Button>

      <PromotionalMaterialDialog material={material} open={editing} onOpenChange={setEditing} />
      <DeleteMaterialDialog
        title={`Apagar “${material.title}”?`}
        description="O arquivo sai de Downloads para todos os afiliados. O arquivo hospedado continua onde está."
        successMessage="Material apagado."
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={() => deletePromotionalMaterial(material.id)}
      />
    </div>
  );
}

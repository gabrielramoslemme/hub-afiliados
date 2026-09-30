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
  As ilhas de cliente da tela: cada botão guarda o estado do próprio diálogo, e
  a lista em volta continua Server Component.
*/

export function NewTrainingModuleButton({ nextPosition }: { nextPosition: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Novo módulo
      </Button>
      <TrainingModuleDialog
        module={null}
        nextPosition={nextPosition}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function TrainingModuleRowActions({ module }: { module: AdminTrainingModule }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        <span className="sr-only">Editar {module.title}</span>
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setDeleting(true)}>
        <Trash2 aria-hidden />
        <span className="sr-only">Apagar {module.title}</span>
      </Button>

      <TrainingModuleDialog
        module={module}
        nextPosition={module.position}
        open={editing}
        onOpenChange={setEditing}
      />
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

export function NewPromotionalMaterialButton({ nextPosition }: { nextPosition: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Novo material
      </Button>
      <PromotionalMaterialDialog
        material={null}
        nextPosition={nextPosition}
        open={open}
        onOpenChange={setOpen}
      />
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
    <div className="flex shrink-0 items-center gap-1">
      <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        <span className="sr-only">Editar {material.title}</span>
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setDeleting(true)}>
        <Trash2 aria-hidden />
        <span className="sr-only">Apagar {material.title}</span>
      </Button>

      <PromotionalMaterialDialog
        material={material}
        nextPosition={material.position}
        open={editing}
        onOpenChange={setEditing}
      />
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

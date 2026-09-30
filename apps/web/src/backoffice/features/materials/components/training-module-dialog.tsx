'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  type AdminTrainingModule,
  type TrainingModuleFormValues,
  type TrainingModuleRequest,
  trainingModuleSchema,
} from '@porto/contracts';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Field, fieldAria } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { saveTrainingModule } from '../actions/training-module.action';
import { trainingModuleFormDefaults } from '../lib/material-form';

interface TrainingModuleDialogProps {
  /** Nulo para criar. */
  module: AdminTrainingModule | null;
  /** A posição sugerida para um módulo novo: depois do último. */
  nextPosition: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VIDEO_HINT = 'Link do YouTube, do Vimeo ou do arquivo .mp4. Precisa começar com https://.';
const POSITION_HINT = 'A ordem na trilha. Posições iguais seguem a ordem de criação.';

export function TrainingModuleDialog({
  module,
  nextPosition,
  open,
  onOpenChange,
}: TrainingModuleDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TrainingModuleFormValues, unknown, TrainingModuleRequest>({
    resolver: zodResolver(trainingModuleSchema),
    defaultValues: trainingModuleFormDefaults(module, nextPosition),
  });

  // Reabrir o diálogo começa do que está salvo, não do rascunho abandonado.
  useEffect(() => {
    if (open) reset(trainingModuleFormDefaults(module, nextPosition));
  }, [open, module, nextPosition, reset]);

  function onSave(values: TrainingModuleRequest) {
    startTransition(async () => {
      const result = await saveTrainingModule(module?.id ?? null, values);

      if (result.status === 'invalid') {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof TrainingModuleRequest, { message });
        }
        return;
      }

      if (result.status === 'failed') {
        toast.error(result.message);
        return;
      }

      onOpenChange(false);
      toast.success(module ? 'Módulo atualizado.' : 'Módulo adicionado à trilha.');
      router.refresh();
    });
  }

  function aria(field: keyof TrainingModuleRequest, hint?: string) {
    return fieldAria(field, { hint, error: errors[field]?.message, required: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit(onSave)} noValidate>
          <DialogHeader>
            <DialogTitle>{module ? 'Editar módulo' : 'Novo módulo'}</DialogTitle>
            <DialogDescription>
              O módulo aparece na trilha de formação da aba Materiais de todos os afiliados assim
              que for salvo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field id="title" label="Título" required error={errors.title?.message}>
              <Input
                {...register('title')}
                {...aria('title')}
                placeholder="Módulo 1 - Porto Serviço"
              />
            </Field>

            <Field id="description" label="Descrição" required error={errors.description?.message}>
              <Textarea {...register('description')} {...aria('description')} rows={3} />
            </Field>

            <Field
              id="videoUrl"
              label="URL do vídeo"
              required
              hint={VIDEO_HINT}
              error={errors.videoUrl?.message}
            >
              <Input
                {...register('videoUrl')}
                {...aria('videoUrl', VIDEO_HINT)}
                type="url"
                inputMode="url"
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="durationMinutes"
                label="Duração (minutos)"
                required
                error={errors.durationMinutes?.message}
              >
                <Input
                  {...register('durationMinutes')}
                  {...aria('durationMinutes')}
                  type="number"
                  min={1}
                  max={600}
                  step={1}
                  inputMode="numeric"
                />
              </Field>

              <Field
                id="position"
                label="Posição"
                required
                hint={POSITION_HINT}
                error={errors.position?.message}
              >
                <Input
                  {...register('position')}
                  {...aria('position', POSITION_HINT)}
                  type="number"
                  min={1}
                  max={999}
                  step={1}
                  inputMode="numeric"
                />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              {module ? 'Salvar alterações' : 'Adicionar módulo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

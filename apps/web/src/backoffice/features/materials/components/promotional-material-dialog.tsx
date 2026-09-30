'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  type AdminPromotionalMaterial,
  MaterialFileFormatEnum,
  type PromotionalMaterialFormValues,
  type PromotionalMaterialRequest,
  promotionalMaterialFormSchema,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { savePromotionalMaterial } from '../actions/promotional-material.action';
import { promotionalMaterialFormDefaults } from '../lib/material-form';

interface PromotionalMaterialDialogProps {
  /** Nulo para criar. */
  material: AdminPromotionalMaterial | null;
  nextPosition: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormField = keyof PromotionalMaterialFormValues;

const URL_HINT = 'O link direto do arquivo, onde a Porto o hospeda. Precisa começar com https://.';
const SIZE_HINT = 'Como aparece no Finder ou no Explorer — ex.: 2,4.';

export function PromotionalMaterialDialog({
  material,
  nextPosition,
  open,
  onOpenChange,
}: PromotionalMaterialDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors },
  } = useForm<PromotionalMaterialFormValues, unknown, PromotionalMaterialRequest>({
    resolver: zodResolver(promotionalMaterialFormSchema),
    defaultValues: promotionalMaterialFormDefaults(material, nextPosition),
  });

  useEffect(() => {
    if (open) reset(promotionalMaterialFormDefaults(material, nextPosition));
  }, [open, material, nextPosition, reset]);

  /*
    O action recebe o formulário como o operador o preencheu — tamanho em MB — e
    revalida com o mesmo schema, que converte para bytes. Mandar o resultado já
    convertido faria o schema do action ler bytes como MB.
  */
  function onSave() {
    startTransition(async () => {
      const result = await savePromotionalMaterial(material?.id ?? null, getValues());

      if (result.status === 'invalid') {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as FormField, { message });
        }
        return;
      }

      if (result.status === 'failed') {
        toast.error(result.message);
        return;
      }

      onOpenChange(false);
      toast.success(material ? 'Material atualizado.' : 'Material adicionado.');
      router.refresh();
    });
  }

  function aria(field: FormField, hint?: string) {
    return fieldAria(field, { hint, error: errors[field]?.message, required: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit(onSave)} noValidate>
          <DialogHeader>
            <DialogTitle>{material ? 'Editar material' : 'Novo material'}</DialogTitle>
            <DialogDescription>
              O arquivo aparece em Downloads, na aba Materiais de todos os afiliados, assim que for
              salvo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field id="title" label="Título" required error={errors.title?.message}>
              <Input {...register('title')} {...aria('title')} placeholder="Mídia Kit" />
            </Field>

            <Field id="description" label="Descrição" required error={errors.description?.message}>
              <Textarea {...register('description')} {...aria('description')} rows={3} />
            </Field>

            <Field
              id="fileUrl"
              label="URL do arquivo"
              required
              hint={URL_HINT}
              error={errors.fileUrl?.message}
            >
              <Input
                {...register('fileUrl')}
                {...aria('fileUrl', URL_HINT)}
                type="url"
                inputMode="url"
                placeholder="https://…/midia-kit.pdf"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="fileFormat" label="Formato" required error={errors.fileFormat?.message}>
                <Controller
                  control={control}
                  name="fileFormat"
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger {...aria('fileFormat')} onBlur={field.onBlur}>
                        <SelectValue placeholder="Escolha" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(MaterialFileFormatEnum).map((format) => (
                          <SelectItem key={format} value={format}>
                            {format}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field
                id="fileSizeMegabytes"
                label="Tamanho (MB)"
                required
                hint={SIZE_HINT}
                error={errors.fileSizeMegabytes?.message}
              >
                <Input
                  {...register('fileSizeMegabytes')}
                  {...aria('fileSizeMegabytes', SIZE_HINT)}
                  type="number"
                  min={0.1}
                  step={0.1}
                  inputMode="decimal"
                />
              </Field>

              <Field id="position" label="Posição" required error={errors.position?.message}>
                <Input
                  {...register('position')}
                  {...aria('position')}
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
              {material ? 'Salvar alterações' : 'Adicionar material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

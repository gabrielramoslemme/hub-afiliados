'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  type ChangeOccupationFormValues,
  type ChangeOccupationRequest,
  changeOccupationSchema,
  OccupationEnum,
} from '@porto/contracts';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Field, fieldAria } from '@/shared/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { occupationName } from '@/shared/lib/format';
import { changeOccupation } from '../actions/change-occupation.action';

interface ChangeOccupationDialogProps {
  occupation: OccupationEnum;
}

/**
 * A troca da ocupação. Sem senha, ao contrário do PIX e do e-mail: ela não
 * desvia pagamento nem toma a conta. A troca fica registrada na auditoria.
 */
export function ChangeOccupationDialog({ occupation }: ChangeOccupationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaultValues: ChangeOccupationFormValues = { occupation };

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangeOccupationFormValues, unknown, ChangeOccupationRequest>({
    resolver: zodResolver(changeOccupationSchema),
    defaultValues,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset(defaultValues);
  }

  function onSave(values: ChangeOccupationRequest) {
    startTransition(async () => {
      const result = await changeOccupation(values);

      if (result.status === 'failed') {
        toast.error(result.message);
        return;
      }

      if (result.status === 'invalid') {
        setError(
          'occupation',
          { type: 'server', message: result.fieldErrors.occupation },
          { shouldFocus: true },
        );
        return;
      }

      onOpenChange(false);
      toast.success('Ocupação alterada.');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Alterar ocupação"
          title="Alterar ocupação"
        >
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit(onSave)} noValidate>
          <DialogHeader>
            <DialogTitle>Alterar ocupação</DialogTitle>
            <DialogDescription>
              Hoje você está como {occupationName(occupation)}. Escolha o que melhor descreve o seu
              trabalho.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field id="occupation" label="Ocupação" required error={errors.occupation?.message}>
              <Controller
                control={control}
                name="occupation"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      {...fieldAria('occupation', {
                        error: errors.occupation?.message,
                        required: true,
                      })}
                      aria-label="Ocupação"
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(OccupationEnum).map((option) => (
                        <SelectItem key={option} value={option}>
                          {occupationName(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
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
              Salvar ocupação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

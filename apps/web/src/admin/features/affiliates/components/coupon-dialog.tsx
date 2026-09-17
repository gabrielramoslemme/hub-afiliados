'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  type ChangeCouponFormValues,
  type ChangeCouponRequest,
  CouponStatusEnum,
  type CouponSummary,
  changeCouponSchema,
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
import { changeCoupon } from '../change-coupon.action';
import { couponChanges } from '../coupon-changes';

interface ChangeCouponDialogProps {
  publicId: string;
  coupon: CouponSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DISCOUNT_HINT = 'De 1% a 25%.';

const STATUS_OPTIONS = [
  { value: CouponStatusEnum.ACTIVE, label: 'Ativo' },
  { value: CouponStatusEnum.INACTIVE, label: 'Inativo' },
];

/**
 * Desativar, reativar ou mudar o percentual. O código fica de fora: ele é a
 * chave da atribuição das vendas, e trocá-lo seria outro cupom, não uma
 * alteração deste.
 */
export function ChangeCouponDialog({
  publicId,
  coupon,
  open,
  onOpenChange,
}: ChangeCouponDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<ChangeCouponFormValues, unknown, ChangeCouponRequest>({
    resolver: zodResolver(changeCouponSchema),
    defaultValues: { status: coupon.status, discountPercent: coupon.discountPercent },
  });

  const deactivating = watch('status') === CouponStatusEnum.INACTIVE;

  function onSave(values: ChangeCouponRequest) {
    const changes = couponChanges(values, dirtyFields);

    startTransition(async () => {
      const result = await changeCoupon(publicId, changes);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      onOpenChange(false);
      // O que acabou de ser salvo passa a ser o ponto de partida da próxima vez.
      reset(values);
      toast.success(`Cupom ${coupon.code} alterado.`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSave)} noValidate>
          <DialogHeader>
            <DialogTitle>Alterar o cupom {coupon.code}</DialogTitle>
            <DialogDescription>
              A alteração vale no checkout da Porto Serviços assim que for salva e fica registrada
              na trilha de auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-ink-900">Situação</legend>
              <div className="flex gap-3">
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`coupon-status-${option.value}`}
                    className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-md border border-input px-3.5 py-3 text-[0.9375rem] text-ink-900 transition-colors hover:border-ink-400 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
                  >
                    <input
                      id={`coupon-status-${option.value}`}
                      type="radio"
                      value={option.value}
                      {...register('status')}
                      className="size-4 accent-blue-600"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {deactivating && (
              <p className="rounded-md border border-ink-200 bg-ink-50 px-3.5 py-3 text-[0.875rem] leading-relaxed text-ink-500">
                Um cupom inativo deixa de valer no checkout, mas continua sendo deste afiliado: o
                código não volta a ficar livre para outra pessoa.
              </p>
            )}

            <Field
              id="discountPercent"
              label="Percentual de desconto"
              required
              hint={DISCOUNT_HINT}
              error={errors.discountPercent?.message}
              className="sm:w-44"
            >
              <Input
                {...register('discountPercent')}
                {...fieldAria('discountPercent', {
                  hint: DISCOUNT_HINT,
                  error: errors.discountPercent?.message,
                  required: true,
                })}
                type="number"
                min={1}
                max={25}
                step={1}
                inputMode="numeric"
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
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

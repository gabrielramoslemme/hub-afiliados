'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  type ApproveAffiliateFormValues,
  type ApproveAffiliateRequest,
  approveAffiliateSchema,
  type RejectAffiliateRequest,
  rejectAffiliateSchema,
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
import { approveAffiliate, checkCouponAvailability, rejectAffiliate } from '../decide.action';

interface DecisionDialogProps {
  publicId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/*
  Meio segundo depois da última tecla: curto o bastante para o aviso chegar
  antes de ela terminar de preencher o percentual, longo o bastante para não
  perguntar à Porto a cada caractere de `MARINA25`.
*/
const AVAILABILITY_DEBOUNCE_MS = 500;

const COUPON_CODE_HINT = 'De 4 a 20 caracteres, só letras e números.';
const DISCOUNT_HINT = 'De 1% a 25%.';

/**
 * Os dois diálogos são controlados de fora porque quem os abre é de dois tipos:
 * os botões do detalhe e o menu de cada linha da fila. Deixar o estado aqui
 * dentro obrigaria o menu a manter o diálogo montado depois de fechar — e o
 * Radix desmonta o conteúdo do menu junto com ele, levando o diálogo embora no
 * meio da confirmação.
 */
export function ApproveDialog({ publicId, name, open, onOpenChange }: DecisionDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [takenReason, setTakenReason] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ApproveAffiliateFormValues, unknown, ApproveAffiliateRequest>({
    resolver: zodResolver(approveAffiliateSchema),
    defaultValues: { couponCode: '', couponDiscountPercent: 10 },
  });

  const couponCode = watch('couponCode');

  /*
    Consulta, não reserva: a autoridade continua sendo a aprovação, que responde
    409 se o código for tomado no meio do caminho. Serve para o conflito aparecer
    no campo em vez de derrubar a confirmação.
  */
  useEffect(() => {
    const typed = couponCode?.trim().toUpperCase() ?? '';

    setTakenReason(null);
    if (!typed) return;

    let current = true;
    const timer = setTimeout(async () => {
      const availability = await checkCouponAvailability(typed);

      // A resposta pode chegar depois de ela já ter mudado o que digitou.
      if (current && !availability.available) setTakenReason(availability.reason);
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [couponCode]);

  function onApprove(values: ApproveAffiliateRequest) {
    if (takenReason) return;

    startTransition(async () => {
      const result = await approveAffiliate(publicId, values);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      onOpenChange(false);
      reset();
      toast.success(`Cadastro de ${name} aprovado.`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onApprove)} noValidate>
          <DialogHeader>
            <DialogTitle>Aprovar o cadastro de {name}?</DialogTitle>
            <DialogDescription>
              A aprovação cria o cupom e o registra na Porto Serviços, para valer no checkout,
              libera o acesso e dispara o e-mail com o link de criação de senha. A decisão fica
              registrada na trilha e não pode ser desfeita pelo painel.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Field
              id="couponCode"
              label="Código do cupom"
              required
              hint={COUPON_CODE_HINT}
              error={errors.couponCode?.message ?? takenReason ?? undefined}
              className="flex-1"
            >
              <Input
                {...register('couponCode')}
                {...fieldAria('couponCode', {
                  hint: COUPON_CODE_HINT,
                  error: errors.couponCode?.message ?? takenReason ?? undefined,
                  required: true,
                })}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="MARINA25"
                className="uppercase"
              />
            </Field>

            <Field
              id="couponDiscountPercent"
              label="Percentual de desconto"
              required
              hint={DISCOUNT_HINT}
              error={errors.couponDiscountPercent?.message}
              className="sm:w-44"
            >
              <Input
                {...register('couponDiscountPercent')}
                {...fieldAria('couponDiscountPercent', {
                  hint: DISCOUNT_HINT,
                  error: errors.couponDiscountPercent?.message,
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
            <Button type="submit" disabled={pending || Boolean(takenReason)}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              Confirmar aprovação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RejectDialog({ publicId, name, open, onOpenChange }: DecisionDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectAffiliateRequest>({
    resolver: zodResolver(rejectAffiliateSchema),
    defaultValues: { reason: '' },
  });

  function onReject(values: RejectAffiliateRequest) {
    startTransition(async () => {
      const result = await rejectAffiliate(publicId, values);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      onOpenChange(false);
      reset();
      toast.success(`Cadastro de ${name} reprovado.`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onReject)} noValidate>
          <DialogHeader>
            <DialogTitle>Reprovar o cadastro de {name}?</DialogTitle>
            <DialogDescription>
              O motivo abaixo vai no e-mail ao afiliado e fica na trilha de auditoria. Escreva para
              quem vai ler do outro lado.
            </DialogDescription>
          </DialogHeader>

          <Field id="reason" label="Motivo da reprovação" required error={errors.reason?.message}>
            <Textarea
              {...register('reason')}
              {...fieldAria('reason', { error: errors.reason?.message, required: true })}
              rows={4}
              placeholder="Descreva o que impediu a aprovação."
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <X aria-hidden />}
              Confirmar reprovação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

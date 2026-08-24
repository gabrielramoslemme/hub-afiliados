'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { type RejectAffiliateRequest, rejectAffiliateSchema } from '@porto/contracts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, fieldAria } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { approveAffiliate, rejectAffiliate } from './decide.action';

interface DecisionActionsProps {
  publicId: string;
  name: string;
}

/**
 * A decisão é irreversível pela interface — não existe desfazer. Por isso as
 * duas ações confirmam antes, e a reprovação exige o motivo que vai no e-mail
 * ao afiliado e na trilha de auditoria.
 */
export function DecisionActions({ publicId, name }: DecisionActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectAffiliateRequest>({
    resolver: zodResolver(rejectAffiliateSchema),
    defaultValues: { reason: '' },
  });

  function onApprove() {
    startTransition(async () => {
      const result = await approveAffiliate(publicId);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setApproving(false);
      toast.success(`Cadastro de ${name} aprovado.`);
      router.refresh();
    });
  }

  function onReject(values: RejectAffiliateRequest) {
    startTransition(async () => {
      const result = await rejectAffiliate(publicId, values);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setRejecting(false);
      reset();
      toast.success(`Cadastro de ${name} reprovado.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Dialog open={approving} onOpenChange={setApproving}>
        <DialogTrigger asChild>
          <Button>
            <Check aria-hidden />
            Aprovar cadastro
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar o cadastro de {name}?</DialogTitle>
            <DialogDescription>
              A aprovação libera o acesso e dispara o e-mail com o link de criação de senha. A
              decisão fica registrada na trilha e não pode ser desfeita pelo painel.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproving(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={onApprove} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              Confirmar aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <X aria-hidden />
            Reprovar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleSubmit(onReject)} noValidate>
            <DialogHeader>
              <DialogTitle>Reprovar o cadastro de {name}?</DialogTitle>
              <DialogDescription>
                O motivo abaixo vai no e-mail ao afiliado e fica na trilha de auditoria. Escreva
                para quem vai ler do outro lado.
              </DialogDescription>
            </DialogHeader>

            <Field id="reason" label="Motivo da reprovação" error={errors.reason?.message}>
              <Textarea
                {...register('reason')}
                {...fieldAria('reason', { error: errors.reason?.message })}
                rows={4}
                placeholder="Descreva o que impediu a aprovação."
              />
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRejecting(false)}
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
    </div>
  );
}

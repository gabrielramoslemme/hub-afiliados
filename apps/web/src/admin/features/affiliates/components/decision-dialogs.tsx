'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { type RejectAffiliateRequest, rejectAffiliateSchema } from '@porto/contracts';
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
import { Textarea } from '@/shared/components/ui/textarea';
import { approveAffiliate, rejectAffiliate } from '../decide.action';

interface DecisionDialogProps {
  publicId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  function onApprove() {
    startTransition(async () => {
      const result = await approveAffiliate(publicId);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      onOpenChange(false);
      toast.success(`Cadastro de ${name} aprovado.`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar o cadastro de {name}?</DialogTitle>
          <DialogDescription>
            A aprovação libera o acesso e dispara o e-mail com o link de criação de senha. A decisão
            fica registrada na trilha e não pode ser desfeita pelo painel.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={onApprove} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            Confirmar aprovação
          </Button>
        </DialogFooter>
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

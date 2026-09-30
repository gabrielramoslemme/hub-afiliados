'use client';

import { Loader2, Send } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
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
import { formatBRL } from '@/shared/lib/format';
import { requestWithdrawal } from '../actions/request-withdrawal.action';

interface WithdrawDialogProps {
  availableCents: number;
  maskedPixKey: string;
}

/**
 * A confirmação existe porque o saque não se desfaz: o valor e a chave ficam
 * na frente da pessoa antes de o PIX sair.
 */
export function WithdrawDialog({ availableCents, maskedPixKey }: WithdrawDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const amount = formatBRL(availableCents);

  function confirm() {
    startTransition(async () => {
      const result = await requestWithdrawal(availableCents);

      if (result.status === 'failed') toast.error(result.message);
      else toast.success(result.message);

      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button className="mt-6 w-full" size="lg" disabled={availableCents === 0}>
          <Send aria-hidden />
          Sacar {amount} via PIX
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sacar {amount}?</DialogTitle>
          <DialogDescription>
            O saldo inteiro vai por PIX para a chave <strong>{maskedPixKey}</strong>. Depois de
            enviado, o saque não pode ser cancelado.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Agora não
          </Button>
          <Button onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Confirmar saque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

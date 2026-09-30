'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import type { SaveMaterialResult } from '../lib/save-result';

interface DeleteMaterialDialogProps {
  title: string;
  description: string;
  successMessage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<SaveMaterialResult<never>>;
}

/** Apagar não tem volta: o afiliado deixa de ver o item assim que a confirmação sai. */
export function DeleteMaterialDialog({
  title,
  description,
  successMessage,
  open,
  onOpenChange,
  onConfirm,
}: DeleteMaterialDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();

      if (result.status !== 'success') {
        toast.error(result.status === 'failed' ? result.message : 'Tente novamente.');
        return;
      }

      onOpenChange(false);
      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
            Apagar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

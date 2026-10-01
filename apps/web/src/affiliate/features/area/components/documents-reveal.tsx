'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Loader2 } from 'lucide-react';
import { createContext, type ReactNode, useContext, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  type PixKeyTypeEnum,
  type RevealDocumentsRequest,
  revealDocumentsSchema,
} from '@porto/contracts';
import { RetryNotice } from '@/shared/components/retry-notice';
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
import { PasswordInput } from '@/shared/components/ui/password-input';
import { useRetryCountdown } from '@/shared/hooks/use-retry-countdown';
import { revealDocuments } from '../actions/reveal-documents.action';
import { type RevealableField, revealedDocuments } from '../lib/profile-rows';

interface DocumentsReveal {
  /** Os documentos inteiros, já formatados; nulo enquanto estão mascarados. */
  revealed: Record<RevealableField, string> | null;
  /** Mascarado, pede a senha; à mostra, mascara de novo e esquece o valor. */
  toggle(): void;
}

const DocumentsRevealContext = createContext<DocumentsReveal | null>(null);

export function useDocumentsReveal(): DocumentsReveal {
  const context = useContext(DocumentsRevealContext);
  if (!context) throw new Error('useDocumentsReveal fora do DocumentsRevealProvider');
  return context;
}

interface DocumentsRevealProviderProps {
  pixKeyType: PixKeyTypeEnum;
  children: ReactNode;
}

const DEFAULT_VALUES: RevealDocumentsRequest = { currentPassword: '' };

/**
 * Uma senha revela os três documentos de uma vez, e mascarar descarta os
 * valores: mostrar de novo pede a senha outra vez, para nenhum documento
 * ficar guardado na tela esperando o próximo clique.
 */
export function DocumentsRevealProvider({ pixKeyType, children }: DocumentsRevealProviderProps) {
  const [revealed, setRevealed] = useState<Record<RevealableField, string> | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const retry = useRetryCountdown();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RevealDocumentsRequest>({
    resolver: zodResolver(revealDocumentsSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset(DEFAULT_VALUES);
  }

  function toggle() {
    if (revealed) setRevealed(null);
    else onOpenChange(true);
  }

  function onConfirm(values: RevealDocumentsRequest) {
    startTransition(async () => {
      const result = await revealDocuments(values);

      if (result.status === 'failed') {
        if (result.retryAfterSeconds) retry.start(result.retryAfterSeconds);
        else toast.error(result.message);
        return;
      }

      if (result.status === 'invalid') {
        setError(
          'currentPassword',
          { type: 'server', message: result.fieldErrors.currentPassword },
          { shouldFocus: true },
        );
        return;
      }

      setRevealed(revealedDocuments(result.documents, pixKeyType));
      onOpenChange(false);
    });
  }

  return (
    <DocumentsRevealContext.Provider value={{ revealed, toggle }}>
      {children}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit(onConfirm)} noValidate>
            <DialogHeader>
              <DialogTitle>Mostrar documentos</DialogTitle>
              <DialogDescription>
                Confirme com a sua senha para ver CPF, RG e chave PIX completos.
              </DialogDescription>
            </DialogHeader>

            <Field
              id="revealPassword"
              label="Senha atual"
              required
              error={errors.currentPassword?.message}
            >
              <PasswordInput
                {...register('currentPassword')}
                {...fieldAria('revealPassword', {
                  error: errors.currentPassword?.message,
                  required: true,
                })}
                autoComplete="current-password"
              />
            </Field>

            <RetryNotice remaining={retry.remaining} />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || retry.remaining > 0}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Eye aria-hidden />}
                Mostrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DocumentsRevealContext.Provider>
  );
}

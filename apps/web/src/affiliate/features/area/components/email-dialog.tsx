'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { type ChangeEmailRequest, changeEmailSchema } from '@porto/contracts';
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
import { Input } from '@/shared/components/ui/input';
import { PasswordInput } from '@/shared/components/ui/password-input';
import { changeEmail } from '../actions/change-email.action';

interface ChangeEmailDialogProps {
  email: string;
}

const EMAIL_HINT = 'É com ele que você vai entrar, e é para ele que mandamos os avisos.';

/**
 * A troca do e-mail, que também é o login. O campo nasce vazio: partir do atual
 * convida a editar um pedaço e salvar sem conferir o resto.
 */
export function ChangeEmailDialog({ email }: ChangeEmailDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaultValues: ChangeEmailRequest = { email: '', currentPassword: '' };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangeEmailRequest>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Fechar descarta o que foi digitado: a senha não fica esperando no
    // formulário pela próxima vez que alguém abrir o diálogo.
    if (!next) reset(defaultValues);
  }

  function onSave(values: ChangeEmailRequest) {
    startTransition(async () => {
      const result = await changeEmail(values);

      if (result.status === 'failed') {
        toast.error(result.message);
        return;
      }

      if (result.status === 'invalid') {
        Object.entries(result.fieldErrors).forEach(([field, message], index) => {
          setError(
            field as keyof ChangeEmailRequest,
            { type: 'server', message },
            { shouldFocus: index === 0 },
          );
        });
        return;
      }

      onOpenChange(false);
      toast.success('E-mail alterado. Use o novo endereço na próxima vez que entrar.');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" aria-label="Alterar e-mail" title="Alterar e-mail">
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit(onSave)} noValidate>
          <DialogHeader>
            <DialogTitle>Alterar e-mail</DialogTitle>
            <DialogDescription>
              Hoje você entra com {email}. Confirme a troca com a sua senha — avisamos esse endereço
              assim que o e-mail mudar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field
              id="email"
              label="Novo e-mail"
              required
              hint={EMAIL_HINT}
              error={errors.email?.message}
            >
              <Input
                {...register('email')}
                {...fieldAria('email', {
                  hint: EMAIL_HINT,
                  error: errors.email?.message,
                  required: true,
                })}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="voce@email.com"
              />
            </Field>

            <Field
              id="currentPassword"
              label="Senha atual"
              required
              error={errors.currentPassword?.message}
            >
              <PasswordInput
                {...register('currentPassword')}
                {...fieldAria('currentPassword', {
                  error: errors.currentPassword?.message,
                  required: true,
                })}
                autoComplete="current-password"
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
              Salvar novo e-mail
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

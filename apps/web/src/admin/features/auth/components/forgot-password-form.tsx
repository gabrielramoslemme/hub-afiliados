'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { type ForgotPasswordRequest, forgotPasswordSchema } from '@porto/contracts';
import { LOGIN_PATH } from '@/admin/shared/routes';
import { Button } from '@/shared/components/ui/button';
import { Field, fieldAria } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { requestPasswordReset } from '../forgot-password.action';

/**
 * A confirmação é a mesma exista ou não conta com aquele e-mail — é o que
 * impede esta tela de virar uma lista de quem opera o painel. Por isso ela fala
 * no condicional: "se houver uma conta".
 */
export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  function onSubmit(values: ForgotPasswordRequest) {
    setFormError(null);

    startTransition(async () => {
      const result = await requestPasswordReset(values);

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-md border border-ink-200 bg-blue-50 px-4 py-3.5">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden />
          <p className="text-sm leading-relaxed text-ink-700">
            Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Ele vale
            por 2 horas e só pode ser usado uma vez.
          </p>
        </div>

        <Link
          href={LOGIN_PATH}
          className="text-center text-sm font-semibold text-blue-700 hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm font-medium text-destructive">{formError}</p>
        </div>
      )}

      {/* A tela existe para este campo: o cursor já começa nele. */}
      <Field id="email" label="E-mail" required error={errors.email?.message}>
        <Input
          {...register('email')}
          {...fieldAria('email', { error: errors.email?.message, required: true })}
          autoFocus
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="voce@porto.example"
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Enviando…
          </>
        ) : (
          'Enviar link de recuperação'
        )}
      </Button>

      <Link
        href={LOGIN_PATH}
        className="text-center text-sm font-semibold text-blue-700 hover:underline"
      >
        Voltar para o login
      </Link>
    </form>
  );
}

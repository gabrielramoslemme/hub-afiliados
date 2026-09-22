'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { type ResetPasswordRequest, resetPasswordSchema } from '@porto/contracts';
import { FORGOT_PASSWORD_PATH, LOGIN_PATH } from '@/backoffice/shared/routes';
import { Button } from '@/shared/components/ui/button';
import { Field, fieldAria } from '@/shared/components/ui/field';
import { PasswordInput } from '@/shared/components/ui/password-input';
import { resetPassword } from '../actions/reset-password.action';

/**
 * O token vem da query string e viaja escondido no formulário: ele é a
 * credencial desta tela, e mostrá-lo não ajudaria ninguém a usá-la.
 *
 * É gêmeo do formulário do portal e mora aqui porque a fatia do painel não
 * alcança a do afiliado — o que os separa é a copy e o peso visual do botão,
 * não a regra.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordRequest>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', passwordConfirmation: '' },
  });

  function onSubmit(values: ResetPasswordRequest) {
    setFormError(null);

    startTransition(async () => {
      const result = await resetPassword(values);

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      // Redefinir não abre sessão: a senha nova estreia no login, que é a única
      // porta do painel.
      router.push(LOGIN_PATH);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <input type="hidden" {...register('token')} />

      {formError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="text-sm font-medium text-destructive">
            <p>{formError}</p>
            <Link href={FORGOT_PASSWORD_PATH} className="mt-1 inline-block underline">
              Pedir um link novo
            </Link>
          </div>
        </div>
      )}

      {/* A tela existe para este formulário: o cursor já começa nele. */}
      <Field id="password" label="Nova senha" required error={errors.password?.message}>
        <PasswordInput
          {...register('password')}
          {...fieldAria('password', { error: errors.password?.message, required: true })}
          autoFocus
          autoComplete="new-password"
          placeholder="Ao menos 8 caracteres"
        />
      </Field>

      <Field
        id="passwordConfirmation"
        label="Repita a senha"
        required
        error={errors.passwordConfirmation?.message}
      >
        <PasswordInput
          {...register('passwordConfirmation')}
          {...fieldAria('passwordConfirmation', {
            error: errors.passwordConfirmation?.message,
            required: true,
          })}
          autoComplete="new-password"
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Salvando…
          </>
        ) : (
          'Redefinir senha'
        )}
      </Button>
    </form>
  );
}

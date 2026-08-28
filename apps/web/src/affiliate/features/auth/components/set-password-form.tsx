'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { type ResetPasswordRequest, resetPasswordSchema } from '@porto/contracts';
import { AFFILIATE_LOGIN_PATH } from '@/affiliate/shared/routes';
import { Button } from '@/shared/components/ui/button';
import { Field, fieldAria } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { setPassword } from '../set-password.action';

/**
 * O token vem da query string e viaja escondido no formulário: ele é a
 * credencial desta tela, e repetir na tela não ajudaria ninguém a usá-la.
 */
export function SetPasswordForm({ token }: { token: string }) {
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
      const result = await setPassword(values);

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      // A senha acabou de nascer: mandar para o login com ela fresca na cabeça
      // é o caminho mais curto até a área, e não guarda credencial em lugar
      // nenhum para conseguir isso.
      router.push(AFFILIATE_LOGIN_PATH);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <input type="hidden" {...register('token')} />

      {formError && (
        <div
          role="alert"
          className="animate-alert flex items-start gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="text-sm font-medium text-destructive">
            <p>{formError}</p>
            <Link href={AFFILIATE_LOGIN_PATH} className="mt-1 inline-block underline">
              Ir para o login
            </Link>
          </div>
        </div>
      )}

      <Field id="password" label="Nova senha" required error={errors.password?.message}>
        <Input
          {...register('password')}
          {...fieldAria('password', { error: errors.password?.message, required: true })}
          type="password"
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
        <Input
          {...register('passwordConfirmation')}
          {...fieldAria('passwordConfirmation', {
            error: errors.passwordConfirmation?.message,
            required: true,
          })}
          type="password"
          autoComplete="new-password"
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Criando…
          </>
        ) : (
          'Criar senha e entrar'
        )}
      </Button>
    </form>
  );
}

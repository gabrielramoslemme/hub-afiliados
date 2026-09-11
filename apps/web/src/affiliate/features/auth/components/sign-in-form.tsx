'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { type AffiliateLoginRequest, affiliateLoginSchema } from '@porto/contracts';
import { Button } from '@/shared/components/ui/button';
import { Field, fieldAria } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { PasswordInput } from '@/shared/components/ui/password-input';
import { signIn } from '../sign-in.action';

export function SignInForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AffiliateLoginRequest>({
    resolver: zodResolver(affiliateLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: AffiliateLoginRequest) {
    setFormError(null);

    startTransition(async () => {
      // Em caso de sucesso o action redireciona e nada volta daqui.
      const result = await signIn(values);

      if (result?.message) setFormError(result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError && (
        <div
          role="alert"
          className="animate-alert flex items-start gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm font-medium text-destructive">{formError}</p>
        </div>
      )}

      {/* A tela existe para este formulário: o cursor já começa nele. */}
      <Field id="email" label="E-mail" required error={errors.email?.message}>
        <Input
          {...register('email')}
          {...fieldAria('email', { error: errors.email?.message, required: true })}
          autoFocus
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="voce@email.com"
        />
      </Field>

      <Field id="password" label="Senha" required error={errors.password?.message}>
        <PasswordInput
          {...register('password')}
          {...fieldAria('password', { error: errors.password?.message, required: true })}
          autoComplete="current-password"
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Entrando…
          </>
        ) : (
          'Entrar'
        )}
      </Button>
    </form>
  );
}

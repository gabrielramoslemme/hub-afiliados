'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  type CreateAffiliateRequest,
  createAffiliateSchema,
  PixKeyTypeEnum,
} from '@porto/contracts';
import { Button } from '@/components/ui/button';
import { Field, fieldAria } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { registration } from '@/core/content/landing';
import { formatCpf, formatPixKey } from './masks';
import { registerAffiliate } from './register-affiliate.action';

const PIX_KEY_LABELS: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'E-mail',
  [PixKeyTypeEnum.PHONE]: 'Telefone',
  [PixKeyTypeEnum.CPF]: 'CPF',
};

const PIX_KEY_PLACEHOLDERS: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'voce@email.com',
  [PixKeyTypeEnum.PHONE]: '(11) 99999-9999',
  [PixKeyTypeEnum.CPF]: '000.000.000-00',
};

export function RegistrationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // O formulário fica no fim de uma página longa: sem trazer o foco, a recusa
  // aparece fora da tela e a pessoa vê só o botão voltando ao normal.
  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CreateAffiliateRequest>({
    resolver: zodResolver(createAffiliateSchema),
    mode: 'onBlur',
    // Corrigiu, o erro some enquanto digita — em vez de esperar o próximo blur
    // ou o próximo envio para dizer que agora está certo.
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      cpf: '',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: '',
    },
  });

  const pixKeyType = watch('pixKeyType');

  function onSubmit(values: CreateAffiliateRequest) {
    setFormError(null);

    startTransition(async () => {
      const result = await registerAffiliate(values);

      if (result.status === 'success') {
        router.push('/cadastro/sucesso');
        return;
      }

      if (result.status === 'failed') {
        setFormError(result.message);
        return;
      }

      // O primeiro campo recusado recebe o foco: a correção começa onde o erro
      // está, sem a pessoa procurar qual dos cinco campos a API reprovou.
      const entries = Object.entries(result.fieldErrors);

      entries.forEach(([field, message], index) => {
        setError(
          field as keyof CreateAffiliateRequest,
          { type: 'server', message },
          { shouldFocus: index === 0 },
        );
      });
    });
  }

  const cpfField = register('cpf');
  const pixKeyField = register('pixKey');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="animate-alert flex items-start gap-3 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 outline-none"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm font-medium text-destructive">{formError}</p>
        </div>
      )}

      <Field id="fullName" label="Nome completo" error={errors.fullName?.message}>
        <Input
          {...register('fullName')}
          {...fieldAria('fullName', { error: errors.fullName?.message })}
          autoComplete="name"
          placeholder="Como está no seu documento"
        />
      </Field>

      <Field id="email" label="E-mail" error={errors.email?.message}>
        <Input
          {...register('email')}
          {...fieldAria('email', { error: errors.email?.message })}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
        />
      </Field>

      <Field id="cpf" label="CPF" error={errors.cpf?.message}>
        <Input
          {...cpfField}
          {...fieldAria('cpf', { error: errors.cpf?.message })}
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          onChange={(event) => {
            event.target.value = formatCpf(event.target.value);
            return cpfField.onChange(event);
          }}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,10rem)_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pixKeyType">Tipo de chave PIX</Label>
          <Controller
            control={control}
            name="pixKeyType"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value: PixKeyTypeEnum) => {
                  field.onChange(value);
                  // Trocar o tipo invalida a chave anterior. No tipo CPF a chave
                  // é obrigatoriamente o CPF do cadastro, então já preenchemos.
                  setValue('pixKey', value === PixKeyTypeEnum.CPF ? getValues('cpf') : '', {
                    shouldValidate: false,
                  });
                }}
              >
                <SelectTrigger id="pixKeyType" aria-label="Tipo de chave PIX">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PixKeyTypeEnum).map((type) => (
                    <SelectItem key={type} value={type}>
                      {PIX_KEY_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <Field
          id="pixKey"
          label="Chave PIX"
          error={errors.pixKey?.message}
          hint="A chave precisa estar no seu nome."
        >
          <Input
            {...pixKeyField}
            {...fieldAria('pixKey', {
              error: errors.pixKey?.message,
              hint: 'A chave precisa estar no seu nome.',
            })}
            autoComplete="off"
            placeholder={PIX_KEY_PLACEHOLDERS[pixKeyType]}
            onChange={(event) => {
              event.target.value = formatPixKey(pixKeyType, event.target.value);
              return pixKeyField.onChange(event);
            }}
          />
        </Field>
      </div>

      <Button type="submit" size="lg" disabled={pending} className="group mt-2 w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Enviando…
          </>
        ) : (
          <>
            Enviar cadastro
            <ArrowRight
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden
            />
          </>
        )}
      </Button>

      <p className="text-[0.8125rem] leading-relaxed text-ink-500">{registration.consent}</p>
    </form>
  );
}

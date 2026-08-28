'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  type CreateAffiliateFormValues,
  type CreateAffiliateRequest,
  createAffiliateSchema,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { registration } from '@/affiliate/shared/content';
import { Button } from '@/shared/components/ui/button';
import { Field, fieldAria } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { socialNetworkName } from '@/shared/lib/format';
import { formatCpf, formatPixKey, formatRg } from '@/shared/lib/masks';
import { registerAffiliate } from '../register-affiliate.action';

const PIX_KEY_LABELS: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'E-mail',
  [PixKeyTypeEnum.PHONE]: 'Telefone',
  [PixKeyTypeEnum.CPF]: 'CPF',
};

const RG_HINT = 'Só o número, sem o órgão emissor.';

const PIX_KEY_PLACEHOLDERS: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'voce@email.com',
  [PixKeyTypeEnum.PHONE]: '(11) 99999-9999',
  [PixKeyTypeEnum.CPF]: '000.000.000-00',
};

/**
 * `autoFocus` é decisão de quem monta a tela, não do formulário: ele é a seção
 * no pé da landing e é a página `/cadastro` inteira. Focar na landing arrastaria
 * quem acabou de abrir a página para o fim dela antes da primeira linha.
 */
export function RegistrationForm({ autoFocus = false }: { autoFocus?: boolean } = {}) {
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
    // Três parâmetros porque o formulário guarda um tipo e envia outro: o
    // `handleSubmit` entrega o que o schema já normalizou.
  } = useForm<CreateAffiliateFormValues, unknown, CreateAffiliateRequest>({
    resolver: zodResolver(createAffiliateSchema),
    mode: 'onBlur',
    // Corrigiu, o erro some enquanto digita — em vez de esperar o próximo blur
    // ou o próximo envio para dizer que agora está certo.
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      cpf: '',
      rg: '',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: '',
      socialNetwork: '',
      socialHandle: '',
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
      // está, sem a pessoa procurar qual dos campos a API reprovou.
      const entries = Object.entries(result.fieldErrors);

      entries.forEach(([field, message], index) => {
        setError(
          field as keyof CreateAffiliateFormValues,
          { type: 'server', message },
          { shouldFocus: index === 0 },
        );
      });
    });
  }

  const cpfField = register('cpf');
  const rgField = register('rg');
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

      <Field id="fullName" label="Nome completo" required error={errors.fullName?.message}>
        <Input
          {...register('fullName')}
          {...fieldAria('fullName', { error: errors.fullName?.message, required: true })}
          autoFocus={autoFocus}
          autoComplete="name"
          placeholder="Como está no seu documento"
        />
      </Field>

      <Field id="email" label="E-mail" required error={errors.email?.message}>
        <Input
          {...register('email')}
          {...fieldAria('email', { error: errors.email?.message, required: true })}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
        />
      </Field>

      {/* Os dois documentos dividem a linha onde há largura: são curtos, e
          juntos encurtam um formulário que já é longo. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="cpf" label="CPF" required error={errors.cpf?.message}>
          <Input
            {...cpfField}
            {...fieldAria('cpf', { error: errors.cpf?.message, required: true })}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            onChange={(event) => {
              event.target.value = formatCpf(event.target.value);
              return cpfField.onChange(event);
            }}
          />
        </Field>

        {/*
          A máscara agrupa sem impor tamanho — o RG varia por estado. Ela come o
          que não é do documento, e é daí que vem a dica: quem digitasse o órgão
          emissor junto veria o `SP` virar parte do número sem perceber.
        */}
        <Field id="rg" label="RG" required error={errors.rg?.message} hint={RG_HINT}>
          <Input
            {...rgField}
            {...fieldAria('rg', {
              error: errors.rg?.message,
              hint: RG_HINT,
              required: true,
            })}
            autoComplete="off"
            placeholder="00.000.000-0"
            onChange={(event) => {
              event.target.value = formatRg(event.target.value);
              return rgField.onChange(event);
            }}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,10rem)_1fr]">
        <Field id="pixKeyType" label="Tipo de chave PIX" required>
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
                <SelectTrigger
                  {...fieldAria('pixKeyType', { required: true })}
                  aria-label="Tipo de chave PIX"
                >
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
        </Field>

        <Field
          id="pixKey"
          label="Chave PIX"
          required
          error={errors.pixKey?.message}
          hint="A chave precisa estar no seu nome."
        >
          <Input
            {...pixKeyField}
            {...fieldAria('pixKey', {
              error: errors.pixKey?.message,
              hint: 'A chave precisa estar no seu nome.',
              required: true,
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

      {/* Opcional, e por isso sem asterisco — mas indivisível: o schema recusa
          um sem o outro, e o erro aparece no campo que ficou faltando. */}
      <div className="grid gap-5 sm:grid-cols-[minmax(0,10rem)_1fr]">
        <Field id="socialNetwork" label="Rede social" error={errors.socialNetwork?.message}>
          <Controller
            control={control}
            name="socialNetwork"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger
                  {...fieldAria('socialNetwork', { error: errors.socialNetwork?.message })}
                  aria-label="Rede social"
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SocialNetworkEnum).map((network) => (
                    <SelectItem key={network} value={network}>
                      {socialNetworkName(network)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field
          id="socialHandle"
          label="@ na rede"
          error={errors.socialHandle?.message}
          hint="Onde você divulga o cupom. Opcional."
        >
          {/* O arroba é moldura do campo, não conteúdo: quem preenche digita só
              o perfil. Colado mesmo assim, o schema tira o arroba repetido. */}
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-500"
            >
              @
            </span>
            <Input
              {...register('socialHandle')}
              {...fieldAria('socialHandle', {
                error: errors.socialHandle?.message,
                hint: 'Onde você divulga o cupom. Opcional.',
              })}
              autoComplete="off"
              placeholder="seuperfil"
              className="pl-7"
            />
          </div>
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

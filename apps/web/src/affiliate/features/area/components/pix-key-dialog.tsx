'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { type ChangePixKeyRequest, changePixKeySchema, PixKeyTypeEnum } from '@porto/contracts';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { pixKeyTypeName } from '@/shared/lib/format';
import { formatPixKey, pixKeyPlaceholder } from '@/shared/lib/masks';
import { changePixKey } from '../actions/change-pix-key.action';

interface ChangePixKeyDialogProps {
  pixKeyType: PixKeyTypeEnum;
  maskedPixKey: string;
}

const KEY_HINT = 'A chave precisa estar no seu nome.';
const CPF_KEY_HINT = 'Use o CPF do seu cadastro.';

/**
 * A troca da chave PIX. O campo da chave nasce vazio: a tela só conhece a chave mascarada, e partir
 * dela obrigaria a pessoa a apagar asteriscos antes de digitar.
 */
export function ChangePixKeyDialog({ pixKeyType, maskedPixKey }: ChangePixKeyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaultValues: ChangePixKeyRequest = { pixKeyType, pixKey: '', currentPassword: '' };

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChangePixKeyRequest>({
    resolver: zodResolver(changePixKeySchema),
    defaultValues,
  });

  const selectedType = watch('pixKeyType');
  const keyHint = selectedType === PixKeyTypeEnum.CPF ? CPF_KEY_HINT : KEY_HINT;

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Fechar descarta o que foi digitado: a senha não fica esperando no
    // formulário pela próxima vez que alguém abrir o diálogo.
    if (!next) reset(defaultValues);
  }

  function onSave(values: ChangePixKeyRequest) {
    startTransition(async () => {
      const result = await changePixKey(values);

      if (result.status === 'failed') {
        toast.error(result.message);
        return;
      }

      if (result.status === 'invalid') {
        Object.entries(result.fieldErrors).forEach(([field, message], index) => {
          setError(
            field as keyof ChangePixKeyRequest,
            { type: 'server', message },
            { shouldFocus: index === 0 },
          );
        });
        return;
      }

      onOpenChange(false);
      toast.success('Chave PIX alterada. Enviamos um aviso para o seu e-mail.');
      router.refresh();
    });
  }

  const pixKeyField = register('pixKey');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Só o ícone, mas com fundo da marca: um lápis neutro se confundiria com o
        texto ao lado. O nome acessível e o `title` dizem o que ele faz, já que
        não há rótulo visível.
      */}
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Alterar chave PIX"
          title="Alterar chave PIX"
        >
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit(onSave)} noValidate>
          <DialogHeader>
            <DialogTitle>Alterar chave PIX</DialogTitle>
            <DialogDescription>
              Hoje os pagamentos vão para {maskedPixKey} ({pixKeyTypeName(pixKeyType)}). Confirme a
              troca com a sua senha — avisamos por e-mail assim que a chave mudar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field id="pixKeyType" label="Tipo de chave" required>
              <Controller
                control={control}
                name="pixKeyType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value: PixKeyTypeEnum) => {
                      field.onChange(value);
                      // A chave digitada para um tipo não serve para outro.
                      setValue('pixKey', '', { shouldValidate: false });
                    }}
                  >
                    <SelectTrigger
                      {...fieldAria('pixKeyType', { required: true })}
                      aria-label="Tipo de chave"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PixKeyTypeEnum).map((type) => (
                        <SelectItem key={type} value={type}>
                          {pixKeyTypeName(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              id="pixKey"
              label="Nova chave PIX"
              required
              hint={keyHint}
              error={errors.pixKey?.message}
            >
              <Input
                {...pixKeyField}
                {...fieldAria('pixKey', {
                  hint: keyHint,
                  error: errors.pixKey?.message,
                  required: true,
                })}
                autoComplete="off"
                placeholder={pixKeyPlaceholder(selectedType)}
                onChange={(event) => {
                  event.target.value = formatPixKey(selectedType, event.target.value);
                  return pixKeyField.onChange(event);
                }}
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
              Salvar nova chave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Label } from './label';

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Rótulo, controle, dica e erro num bloco só. Existe para o `aria-describedby`
 * apontar sempre para o texto certo — leitor de tela que anuncia o rótulo e cala
 * o erro deixa o formulário intransponível sem enxergar a tela.
 */
export function Field({ id, label, hint, error, required, className, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/*
        O asterisco fica fora do `<label>`, e não dentro: é decoração, e no
        rótulo ele entraria no texto associado ao controle. Quem usa leitor de
        tela recebe a obrigatoriedade pelo `aria-required`, e o nome anunciado
        continua sendo só o do campo.
      */}
      <div className="flex items-center gap-0.5">
        <Label htmlFor={id} data-invalid={Boolean(error)}>
          {label}
        </Label>
        {required && (
          <span aria-hidden className="text-sm font-medium text-destructive">
            *
          </span>
        )}
      </div>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-[0.8125rem] leading-snug text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[0.8125rem] font-medium leading-snug text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Os ids que o controle precisa devolver para o bloco acima funcionar. */
export function fieldAria(
  id: string,
  { hint, error, required }: { hint?: string; error?: string; required?: boolean },
) {
  const describedBy = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy || undefined,
    'aria-required': required || undefined,
  };
}

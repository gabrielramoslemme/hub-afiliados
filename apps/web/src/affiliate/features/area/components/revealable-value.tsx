'use client';

import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { RevealableField } from '../lib/profile-rows';
import { useDocumentsReveal } from './documents-reveal';

interface RevealableValueProps {
  field: RevealableField;
  label: string;
  masked: string;
}

/**
 * Valor que abre mascarado e mostra o inteiro no olho, como o campo de senha.
 * O inteiro não está na página: o olho pede a senha, e só então ele chega.
 */
export function RevealableValue({ field, label, masked }: RevealableValueProps) {
  const { revealed, toggle } = useDocumentsReveal();

  const visible = revealed !== null;
  const ToggleIcon = visible ? EyeOff : Eye;
  const toggleLabel = `${visible ? 'Ocultar' : 'Mostrar'} ${label}`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{revealed ? revealed[field] : masked}</span>
      <button
        type="button"
        aria-label={toggleLabel}
        aria-pressed={visible}
        title={toggleLabel}
        onClick={toggle}
        className={cn(
          'flex size-8 items-center justify-center rounded-md',
          'text-ink-400 transition-colors duration-150',
          'hover:bg-ink-100 hover:text-ink-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <ToggleIcon className="size-4" aria-hidden />
      </button>
    </span>
  );
}

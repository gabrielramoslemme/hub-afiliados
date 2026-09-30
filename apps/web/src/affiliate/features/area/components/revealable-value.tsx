'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

interface RevealableValueProps {
  label: string;
  masked: string;
  revealed: string;
}

/**
 * Valor que abre mascarado e mostra o inteiro no olho, como o campo de senha.
 * O estado não sobrevive à navegação de propósito: voltar ao perfil mascara de
 * novo, e ninguém esquece um CPF à mostra na tela.
 */
export function RevealableValue({ label, masked, revealed }: RevealableValueProps) {
  const [visible, setVisible] = useState(false);

  const ToggleIcon = visible ? EyeOff : Eye;
  const toggleLabel = `${visible ? 'Ocultar' : 'Mostrar'} ${label}`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{visible ? revealed : masked}</span>
      <button
        type="button"
        aria-label={toggleLabel}
        aria-pressed={visible}
        title={toggleLabel}
        onClick={() => setVisible((shown) => !shown)}
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

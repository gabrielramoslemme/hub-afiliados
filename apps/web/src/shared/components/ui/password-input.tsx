'use client';

import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Input } from './input';

/**
 * Campo de senha com o olho de ver/ocultar. Digitar senha às cegas é a maior
 * fonte de erro de digitação nos dois logins e na criação de senha — e errar ali
 * custa uma mensagem de credencial inválida que não diz o que aconteceu.
 *
 * O `type` não é prop de propósito: quem monta o campo escolhe o rótulo e o
 * `autoComplete`, nunca se ele está visível — isso é estado do componente.
 */
export function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);

  const ToggleIcon = visible ? EyeOff : Eye;
  const toggleLabel = visible ? 'Ocultar senha' : 'Mostrar senha';

  return (
    <div className="relative">
      <Input
        {...props}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={toggleLabel}
        title={toggleLabel}
        // O clique de ponteiro não tira o foco do campo: quem estava digitando
        // volta a digitar sem procurar o cursor. Pelo teclado o `preventDefault`
        // não vale, e o foco fica no botão — que é onde ele tem de ficar para a
        // pessoa desligar o olho logo em seguida.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((shown) => !shown)}
        className={cn(
          'absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-md',
          'text-ink-400 transition-colors duration-150',
          'hover:bg-ink-100 hover:text-ink-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:text-ink-300',
        )}
      >
        <ToggleIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}

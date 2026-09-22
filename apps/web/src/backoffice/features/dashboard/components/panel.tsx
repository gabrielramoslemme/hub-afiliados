import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * O bloco branco da tela. Existe porque o dashboard repete a mesma superfície
 * oito vezes, e oito cópias das mesmas quatro classes divergem no primeiro
 * ajuste de sombra. Fora daqui a fila continua montando o painel dela na mão —
 * dois casos não pagam um componente compartilhado.
 */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-panel border border-ink-200 bg-white shadow-card', className)}
      {...props}
    />
  );
}

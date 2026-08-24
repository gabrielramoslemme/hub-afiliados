import type { ComponentProps } from 'react';
import { cn } from '@/core/cn';

/**
 * Tabela paginada no servidor: a ordenação e a página vivem na URL, então não há
 * estado de cliente para uma biblioteca de tabela gerenciar. Isto aqui é
 * marcação com o estilo certo, e é tudo o que a fila precisa.
 */
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full caption-bottom border-collapse text-sm', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-ink-200', className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('border-b border-ink-200 transition-colors hover:bg-ink-50/70', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-11 whitespace-nowrap px-4 text-left align-middle',
        'text-xs font-semibold uppercase tracking-[0.06em] text-ink-500',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3.5 align-middle text-ink-700', className)} {...props} />;
}

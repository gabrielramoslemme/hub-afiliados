import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/core/cn';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-6 lg:px-8', className)} {...props} />;
}

export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-eyebrow uppercase text-blue-600', className)} {...props} />;
}

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  align?: 'left' | 'center';
  className?: string;
}

/*
  Sem variante escura: a única faixa escura do documento é o hero, e ele monta o
  próprio título. Um `tone` aqui seria um caminho que nada percorre.
*/
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className={cn(
          'text-title max-w-[20ch] text-balance text-ink-900',
          align === 'center' && 'max-w-[24ch]',
        )}
      >
        {title}
      </h2>
      {lead && <p className="text-lead max-w-[58ch] text-ink-500">{lead}</p>}
    </div>
  );
}

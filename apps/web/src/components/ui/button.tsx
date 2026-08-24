import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/core/cn';

const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'font-semibold tracking-[-0.01em] transition-[background-color,color,border-color,transform]',
    'duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-blue-700',
        secondary: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
        outline: 'border border-ink-300 bg-background text-foreground hover:bg-ink-50',
        ghost: 'text-ink-700 hover:bg-ink-100',
        /*
          As duas variantes de fundo escuro. Existem porque `primary` é azul e
          some sobre a faixa da marca — quem descobrisse isso na tela resolveria
          com um `bg-white` solto no JSX, que é o que estas linhas evitam.
        */
        inverse: 'bg-white text-blue-700 hover:bg-blue-50',
        'inverse-outline':
          'border border-white/35 bg-white/10 text-white hover:border-white/60 hover:bg-white/20',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-red-800',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm [&_svg]:size-4',
        md: 'h-11 px-5 text-[0.9375rem] [&_svg]:size-[1.125rem]',
        lg: 'h-13 px-7 text-base [&_svg]:size-5',
        icon: 'size-9 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };

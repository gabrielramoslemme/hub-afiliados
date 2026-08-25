'use client';

import { ChevronsUpDown, LogOut } from 'lucide-react';
import { useTransition } from 'react';
import { signOut } from '@/admin/features/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/cn';

interface UserMenuProps {
  name: string;
  email: string;
  roleLabel: string;
  /** `dark` veste o gatilho para a faixa da marca, no rodapé da sidebar. */
  tone?: 'light' | 'dark';
}

export function UserMenu({ name, email, roleLabel, tone = 'light' }: UserMenuProps) {
  const [pending, startTransition] = useTransition();
  const dark = tone === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-3 rounded-card px-2 py-2 text-left transition-colors',
          'outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
          dark
            ? 'hover:bg-white/5 data-[state=open]:bg-white/10'
            : 'hover:bg-ink-100 data-[state=open]:bg-ink-100',
        )}
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            dark ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-700',
          )}
          aria-hidden
        >
          {name.slice(0, 1).toUpperCase()}
        </span>

        {/* `min-w-0` mais `truncate`: nome longo encurta em vez de esticar a
            faixa e empurrar o resto da navegação para fora. */}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm font-semibold',
              dark ? 'text-white' : 'text-ink-900',
            )}
          >
            {name}
          </span>
          <span
            className={cn('block truncate text-[0.75rem]', dark ? 'text-blue-200' : 'text-ink-500')}
          >
            {roleLabel}
          </span>
        </span>

        <ChevronsUpDown
          className={cn('size-3.5 shrink-0', dark ? 'text-blue-300' : 'text-ink-400')}
          aria-hidden
        />
        <span className="sr-only">Abrir menu da conta</span>
      </DropdownMenuTrigger>

      {/* No rodapé da sidebar o menu sobe: para baixo ele sairia da janela. */}
      <DropdownMenuContent
        align={dark ? 'start' : 'end'}
        side={dark ? 'top' : 'bottom'}
        className="w-[13.5rem]"
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
          <p className="truncate text-[0.8125rem] text-ink-500">{email}</p>
          <p className="mt-1 text-[0.75rem] font-medium text-blue-600">{roleLabel}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => {
              void signOut();
            });
          }}
        >
          <LogOut aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

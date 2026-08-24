'use client';

import { ChevronDown, LogOut } from 'lucide-react';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/features/admin-auth/sign-out.action';

interface UserMenuProps {
  name: string;
  email: string;
  roleLabel: string;
}

export function UserMenu({ name, email, roleLabel }: UserMenuProps) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
            {name.slice(0, 1)}
          </span>
          <span className="hidden sm:inline">{name}</span>
          <ChevronDown className="size-3.5 text-ink-400" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-ink-900">{name}</p>
          <p className="text-[0.8125rem] text-ink-500">{email}</p>
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

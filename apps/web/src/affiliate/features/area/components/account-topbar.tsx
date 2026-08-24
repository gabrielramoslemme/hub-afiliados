import { LogOut } from 'lucide-react';
import { signOut } from '@/affiliate/features/auth';
import { PortoLogo } from '@/shared/components/porto-logo';
import { Button } from '@/shared/components/ui/button';
import { AccountNav } from './account-nav';

/** Primeiro nome só: a barra é estreita e "Olá, Cleide" basta para reconhecer. */
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0];
}

export function AccountTopbar({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-5 lg:px-8">
        <PortoLogo />

        <AccountNav variant="inline" />

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-500 sm:inline">
            Olá, <strong className="font-semibold text-ink-900">{firstNameOf(name)}</strong>
          </span>

          {/*
            Sair é escrita, então é `form` com Server Action e não `Link`: um GET
            que encerra sessão é encerrado por qualquer prefetch do navegador.
          */}
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="gap-2">
              <LogOut aria-hidden />
              <span className="hidden sm:inline">Sair</span>
              <span className="sr-only sm:hidden">Sair</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

import type { PropsWithChildren } from 'react';
import { SiteFooter } from '@/affiliate/shared/components/site-footer';
import { SiteHeader } from '@/affiliate/shared/components/site-header';

export default function SiteLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      {/*
        Em tela curta, como as de senha, o rodapé subiria e deixaria uma faixa
        branca embaixo. A última seção cresce até ele para o fundo dela, e não o
        branco do documento, ocupar a sobra.
      */}
      <main id="conteudo" className="flex flex-1 flex-col [&>:last-child]:flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

import type { PropsWithChildren } from 'react';
import { SiteFooter } from '@/affiliate/shared/components/site-footer';
import { SiteHeader } from '@/affiliate/shared/components/site-header';

export default function SiteLayout({ children }: PropsWithChildren) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo">{children}</main>
      <SiteFooter />
    </>
  );
}

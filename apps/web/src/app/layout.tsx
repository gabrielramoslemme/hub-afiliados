import type { Metadata, Viewport } from 'next';
import { Open_Sans } from 'next/font/google';
import type { PropsWithChildren } from 'react';
import { site } from '@/affiliate/shared/content';
import { Toaster } from '@/shared/components/ui/toaster';
import './globals.css';

/*
  Uma família só, servida pelo next/font: sem requisição a terceiro, sem
  flash de fonte e com o subset recortado no build.
*/
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-open-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${site.program} — ${site.company}`,
    template: `%s · ${site.program}`,
  },
  description:
    'Indique os serviços da Porto com um cupom exclusivo e seja remunerado a cada venda concluída. Cadastro gratuito, sem CNPJ e com pagamento via PIX.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: `${site.program} — ${site.company}`,
  },
};

export const viewport: Viewport = {
  themeColor: '#0046c0',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR" className={openSans.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

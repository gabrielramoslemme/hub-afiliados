import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';
import { RefineProvider } from '@/core/providers/refine-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hub de Afiliados — Painel',
  description: 'Backoffice de análise e aprovação de afiliados',
};

export default function RootLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="pt-BR">
      <body>
        <RefineProvider>{children}</RefineProvider>
      </body>
    </html>
  );
}

import { Info } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInForm } from '@/backoffice/features/auth';
import { FORGOT_PASSWORD_PATH, REDIRECT_PARAM } from '@/backoffice/shared/routes';
import { PortoLogo } from '@/shared/components/porto-logo';

export const metadata: Metadata = {
  title: 'Entrar no painel',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params[REDIRECT_PARAM];
  const target = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="flex min-h-svh items-center justify-center bg-blue-50 px-6 py-16">
      <div className="w-full max-w-sm">
        <PortoLogo />

        <div className="mt-8 rounded-card border border-ink-200 bg-white p-8">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink-900">Painel de análise</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-500">
            Acesso restrito aos times da Porto e da Mesa.
          </p>

          {/*
            Chegar aqui por redirecionamento e não saber por quê é o que faz a
            tela parecer quebrada. Quando há destino guardado, ela diz.
          */}
          {target && (
            <p className="mt-5 flex items-start gap-2.5 rounded-md bg-blue-50 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-blue-700">
              <Info className="mt-px size-4 shrink-0" aria-hidden />
              Entre para continuar de onde você parou. Levamos você de volta.
            </p>
          )}

          <div className="mt-7">
            <SignInForm target={target} />
          </div>
        </div>

        <p className="mt-6 text-center text-[0.8125rem]">
          <Link href={FORGOT_PASSWORD_PATH} className="font-semibold text-blue-700 hover:underline">
            Esqueci minha senha
          </Link>
        </p>
      </div>
    </main>
  );
}

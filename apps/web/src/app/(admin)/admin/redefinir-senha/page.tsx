import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/admin/features/auth';
import { FORGOT_PASSWORD_PATH } from '@/admin/shared/routes';
import { PortoLogo } from '@/shared/components/porto-logo';

export const metadata: Metadata = {
  title: 'Redefinir senha',
  robots: { index: false, follow: false },
};

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="flex min-h-svh items-center justify-center bg-blue-50 px-6 py-16">
      <div className="w-full max-w-sm">
        <PortoLogo />

        <div className="mt-8 rounded-card border border-ink-200 bg-white p-8">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink-900">Redefinir senha</h1>

          {token ? (
            <>
              <p className="mt-1.5 text-[0.9375rem] text-ink-500">
                Escolha a senha que você vai usar para entrar no painel.
              </p>

              <div className="mt-7">
                <ResetPasswordForm token={token} />
              </div>
            </>
          ) : (
            /* Sem token não há o que redefinir: a tela não existe fora do link
               do e-mail, e fingir um formulário aqui só produziria um erro
               depois do trabalho de preencher. */
            <>
              <p className="mt-1.5 text-[0.9375rem] text-ink-500">
                Abra esta página pelo link que enviamos por e-mail. Ele vale por 2 horas e só pode
                ser usado uma vez.
              </p>

              <Link
                href={FORGOT_PASSWORD_PATH}
                className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:underline"
              >
                Pedir um link novo
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

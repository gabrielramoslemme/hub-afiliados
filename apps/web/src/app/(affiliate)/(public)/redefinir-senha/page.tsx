import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/affiliate/features/auth';
import { Container } from '@/affiliate/shared/components/section';
import { AFFILIATE_FORGOT_PASSWORD_PATH } from '@/affiliate/shared/routes';

export const metadata: Metadata = {
  title: 'Redefinir sua senha',
  robots: { index: false, follow: false },
};

export default async function AffiliateResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  return (
    <section className="bg-blue-50 py-20 lg:py-28">
      <Container className="max-w-lg">
        <div className="rounded-panel border border-ink-200 bg-white p-8 shadow-card sm:p-9">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink-900">Redefinir sua senha</h1>

          {token ? (
            <>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
                Escolha a senha que você vai usar para entrar na sua área.
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
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
                Abra esta página pelo link que enviamos por e-mail. Ele vale por 2 horas e só pode
                ser usado uma vez.
              </p>

              <Link
                href={AFFILIATE_FORGOT_PASSWORD_PATH}
                className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:underline"
              >
                Pedir um link novo
              </Link>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}

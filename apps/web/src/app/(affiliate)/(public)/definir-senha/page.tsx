import type { Metadata } from 'next';
import Link from 'next/link';
import { SetPasswordForm } from '@/affiliate/features/auth';
import { Container } from '@/affiliate/shared/components/section';
import { AFFILIATE_LOGIN_PATH } from '@/affiliate/shared/routes';

export const metadata: Metadata = {
  title: 'Criar sua senha',
  robots: { index: false, follow: false },
};

export default async function SetPasswordPage({
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
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink-900">Criar sua senha</h1>

          {token ? (
            <>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
                Seu cadastro foi aprovado. Escolha a senha que você vai usar para entrar na sua
                área.
              </p>

              <div className="mt-7">
                <SetPasswordForm token={token} />
              </div>
            </>
          ) : (
            /* Sem token não há o que criar: a tela não existe fora do link do
               e-mail, e fingir um formulário aqui só produziria um erro depois
               do trabalho de preencher. */
            <>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
                Abra esta página pelo link que enviamos por e-mail depois da aprovação do seu
                cadastro. O link vale por 48 horas.
              </p>

              <Link
                href={AFFILIATE_LOGIN_PATH}
                className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:underline"
              >
                Já tenho senha, quero entrar
              </Link>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}

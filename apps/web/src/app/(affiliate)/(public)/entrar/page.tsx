import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInForm } from '@/affiliate/features/auth';
import { Container } from '@/affiliate/shared/components/section';
import { site } from '@/affiliate/shared/content';

export const metadata: Metadata = {
  title: 'Entrar na sua área',
  description:
    'Acesse a área do afiliado do Hub de Afiliados da Porto Serviços para ver o seu cupom e o extrato das suas indicações.',
  robots: { index: false, follow: false },
};

export default function AffiliateSignInPage() {
  return (
    <section className="bg-blue-50 py-20 lg:py-28">
      <Container className="max-w-lg">
        <div className="rounded-panel border border-ink-200 bg-white p-8 shadow-card sm:p-9">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink-900">Entrar na sua área</h1>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
            Use o e-mail do cadastro e a senha que você criou pelo link enviado após a aprovação.
          </p>

          <div className="mt-7">
            <SignInForm />
          </div>
        </div>

        {/*
          Quem chega aqui sem conta é quem ainda não se cadastrou — e é a maior
          parte de quem clica em "acessar" numa landing page. O caminho de volta
          fica visível em vez de exigir a seta do navegador.
        */}
        <p className="mt-6 text-center text-[0.9375rem] text-ink-500">
          Ainda não é afiliado?{' '}
          <Link href="/cadastro" className="font-semibold text-blue-600 hover:underline">
            Cadastre-se
          </Link>
        </p>

        <p className="mt-2 text-center text-[0.8125rem] text-ink-400">
          Problemas para entrar? Escreva para{' '}
          <a href={`mailto:${site.contactEmail}`} className="hover:text-blue-600">
            {site.contactEmail}
          </a>
          .
        </p>
      </Container>
    </section>
  );
}

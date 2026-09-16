import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/affiliate/features/auth';
import { Container } from '@/affiliate/shared/components/section';

export const metadata: Metadata = {
  title: 'Esqueci minha senha',
  robots: { index: false, follow: false },
};

export default function AffiliateForgotPasswordPage() {
  return (
    <section className="bg-blue-50 py-20 lg:py-28">
      <Container className="max-w-lg">
        <div className="rounded-panel border border-ink-200 bg-white p-8 shadow-card sm:p-9">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink-900">Esqueci minha senha</h1>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
            Informe o e-mail do seu cadastro. Se houver uma conta com ele, enviamos um link para
            você escolher uma senha nova.
          </p>

          <div className="mt-7">
            <ForgotPasswordForm />
          </div>
        </div>
      </Container>
    </section>
  );
}

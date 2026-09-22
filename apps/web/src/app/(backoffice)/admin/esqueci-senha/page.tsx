import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/backoffice/features/auth';
import { PortoLogo } from '@/shared/components/porto-logo';

export const metadata: Metadata = {
  title: 'Esqueci minha senha',
  robots: { index: false, follow: false },
};

export default function AdminForgotPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-blue-50 px-6 py-16">
      <div className="w-full max-w-sm">
        <PortoLogo />

        <div className="mt-8 rounded-card border border-ink-200 bg-white p-8">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink-900">Esqueci minha senha</h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-500">
            Informe o e-mail da sua conta do painel. Se houver uma conta com ele, enviamos um link
            para você escolher uma senha nova.
          </p>

          <div className="mt-7">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}

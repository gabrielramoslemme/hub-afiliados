import { Mail } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/affiliate/shared/components/section';
import { Button } from '@/shared/components/ui/button';

export const metadata: Metadata = {
  title: 'Cadastro enviado',
  // A página não expõe dado nenhum, mas também não tem por que ser indexada.
  robots: { index: false, follow: false },
};

export default function RegistrationSuccessPage() {
  return (
    <section className="bg-blue-50 py-28">
      <Container className="max-w-2xl text-center">
        {/*
          O check é riscado no lugar de aparecer pronto: é a única confirmação
          que a pessoa recebe nesta tela, e vale um segundo de atenção. O traço
          fica em `animate-draw` — tempo, e não rolagem — porque a peça já está
          na tela quando a página abre.
        */}
        <span className="animate-pop-in mx-auto flex size-16 items-center justify-center rounded-pill bg-[var(--status-approved-surface)]">
          <svg
            viewBox="0 0 24 24"
            className="size-8 text-[var(--status-approved)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path
              d="M20 6 9 17l-5-5"
              className="animate-draw [animation-delay:180ms] [stroke-dasharray:32]"
            />
          </svg>
        </span>

        <h1 className="text-title mt-8 text-balance text-ink-900">Cadastro enviado para análise</h1>

        <p className="text-lead mx-auto mt-5 max-w-[52ch] text-ink-500">
          Recebemos os seus dados. A análise é feita por uma pessoa do time da Porto, cadastro por
          cadastro — não há triagem automática.
        </p>

        <div className="animate-rise mx-auto mt-10 flex max-w-md items-start gap-3.5 rounded-panel border border-ink-200 bg-white p-5 text-left shadow-card [animation-delay:320ms]">
          <Mail className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
          <div>
            <p className="font-semibold text-ink-900">Confira seu e-mail</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-500">
              Enviamos a confirmação de recebimento agora. A decisão chega no mesmo endereço —
              aprovado, com o link para criar sua senha; reprovado, com o motivo registrado.
            </p>
          </div>
        </div>

        <Button asChild variant="outline" className="mt-10">
          <Link href="/">Voltar para o início</Link>
        </Button>
      </Container>
    </section>
  );
}

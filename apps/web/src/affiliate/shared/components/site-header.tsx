'use client';

import { ArrowRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { nav, site } from '@/affiliate/shared/content';
import { AFFILIATE_LOGIN_PATH } from '@/affiliate/shared/routes';
import { destinationsFor } from '@/affiliate/shared/site-destinations';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { SiteLogo, TOP_ANCHOR_ID } from './site-logo';

const SECTION_IDS = nav.map((item) => item.href.replace('#', ''));

/**
 * Qual seção está sendo lida. A margem recorta a viewport numa faixa estreita no
 * meio da tela: sem ela, duas seções ficam visíveis ao mesmo tempo e o indicador
 * pisca entre as duas durante a rolagem.
 */
function useActiveSection(): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (element): element is HTMLElement => element !== null,
    );

    if (sections.length === 0) return;

    /*
      O callback só traz quem mudou desde a última checagem, não o estado de
      todas as seções — por isso guardamos quem está na faixa agora à parte.
      Sem isso, rolar de volta ao topo faz "como-funciona" sair da faixa sem
      nenhuma outra seção rastreada entrar no lugar: nenhum entry chega
      `isIntersecting`, `setActive` nunca é chamado de novo e o indicador
      fica travado na última seção vista.
    */
    const intersecting = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersecting.add(entry.target.id);
          } else {
            intersecting.delete(entry.target.id);
          }
        }

        const current = SECTION_IDS.find((id) => intersecting.has(id));
        setActive(current ?? null);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    for (const section of sections) observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return active;
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection();
  const destinations = destinationsFor(usePathname());

  useEffect(() => {
    function onScroll(): void {
      setScrolled(window.scrollY > 8);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header
      id={TOP_ANCHOR_ID}
      /*
        A barra é opaca desde o topo, e não transparente até a primeira rolagem.
        Transparente ela herdaria o fundo de quem está atrás — e o que está atrás
        no topo é o branco do documento, não o gradiente do hero: o header ocupa
        lugar no fluxo, acima da seção, em vez de flutuar sobre ela. Texto claro
        ali some. Rolar só acrescenta a sombra que descola a barra da página.
      */
      className={cn(
        'sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur-md',
        'transition-shadow duration-200',
        (scrolled || open) && 'shadow-card',
      )}
    >
      <div className="container-site flex h-16 items-center justify-between">
        <SiteLogo />

        <nav className="hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => {
            const isActive = active === item.href.replace('#', '');

            return (
              <Link
                key={item.href}
                href={destinations.section(item.href)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'relative whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-blue-700' : 'text-ink-700 hover:text-blue-600',
                )}
              >
                {item.label}
                {/*
                  A régua acompanha a leitura em vez de acompanhar o clique: quem
                  rolou até a seção vê onde está sem ter usado o menu.
                */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-2.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-cyan-500',
                    'transition-transform duration-300',
                    isActive ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {/*
            Quem já é afiliado vem à landing para entrar, não para se cadastrar
            de novo. O acesso fica ao lado do CTA e em peso menor: é o caminho
            de quem já converteu, não o que a página está vendendo.
          */}
          <Button asChild size="sm" variant="ghost" className="hidden lg:inline-flex">
            <Link href={AFFILIATE_LOGIN_PATH}>{site.accountCta}</Link>
          </Button>

          {/*
            No celular o botão fica também, encurtado: é a única ação da página,
            e escondê-la atrás do menu obrigava a pessoa a rolar até o hero ou
            abrir o menu para achar o cadastro. Abaixo de 360px ele encostaria
            no logotipo; ali o cadastro continua no menu e no hero.
          */}
          <Button asChild size="sm" className="group hidden min-[360px]:inline-flex">
            <Link href={destinations.registration}>
              <span className="sm:hidden">Cadastrar</span>
              <span className="hidden sm:inline">Quero me cadastrar</span>
              <ArrowRight className="hidden transition-transform duration-200 group-hover:translate-x-0.5 sm:block" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <nav
          id="menu-mobile"
          className="animate-pop-in origin-top border-t border-ink-200 bg-white lg:hidden"
        >
          <ul className="container-site py-2">
            {[
              ...nav.map((item) => ({ ...item, href: destinations.section(item.href) })),
              { label: site.accountCta, href: AFFILIATE_LOGIN_PATH },
              { label: 'Quero me cadastrar', href: destinations.registration },
            ].map((item) => (
              <li key={item.href} className="border-b border-ink-100 last:border-0">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-3.5 font-medium text-ink-700 active:text-blue-600"
                >
                  {item.label}
                  <ArrowRight className="size-4 text-ink-300" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Progresso de leitura: `scroll()` nativa, sem ouvinte e sem re-render. */}
      <span
        aria-hidden
        className="scroll-progress absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-blue-600"
      />
    </header>
  );
}

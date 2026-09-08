'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AFFILIATE_AREA_PATH } from '@/affiliate/shared/routes';
import { PortoLogo } from '@/shared/components/porto-logo';

/**
 * Âncora do topo do documento. O `id` mora no `<header>`, que é o primeiro
 * elemento do fluxo — com o `scroll-padding-top` do `globals.css`, o alvo é
 * recuado além do início da página e o navegador para no zero.
 */
export const TOP_ANCHOR_ID = 'topo';

/**
 * O logotipo leva para o começo de onde a pessoa está, e "começo" muda com a
 * página: na landing é o topo dela mesma, numa página pública é a landing, e
 * dentro da conta é a primeira tela depois do login — mandar quem já entrou
 * de volta para a peça de venda seria tirá-la do produto.
 */
function destinationFor(pathname: string): string {
  if (pathname === AFFILIATE_AREA_PATH || pathname.startsWith(`${AFFILIATE_AREA_PATH}/`)) {
    return AFFILIATE_AREA_PATH;
  }

  return pathname === '/' ? `#${TOP_ANCHOR_ID}` : '/';
}

export function SiteLogo({ tone }: { tone?: 'light' | 'dark' }) {
  return (
    <Link
      href={destinationFor(usePathname())}
      aria-label="Influenciadores da Porto Serviço"
      className="rounded-sm transition-opacity hover:opacity-80"
    >
      <PortoLogo tone={tone} />
    </Link>
  );
}

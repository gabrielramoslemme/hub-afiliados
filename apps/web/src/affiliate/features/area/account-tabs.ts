import {
  AFFILIATE_AREA_PATH,
  AFFILIATE_MATERIALS_PATH,
  AFFILIATE_PROFILE_PATH,
  AFFILIATE_WALLET_PATH,
} from '@/affiliate/shared/routes';

export const ACCOUNT_TABS = [
  { href: AFFILIATE_AREA_PATH, label: 'Início' },
  { href: AFFILIATE_WALLET_PATH, label: 'Carteira' },
  { href: AFFILIATE_MATERIALS_PATH, label: 'Materiais' },
  { href: AFFILIATE_PROFILE_PATH, label: 'Perfil' },
] as const;

export type AccountTabHref = (typeof ACCOUNT_TABS)[number]['href'];

/**
 * O Início é a raiz da área, então `startsWith` o marcaria como ativo em toda
 * subpágina. Só ele compara por igualdade; as outras abas aceitam o que vier
 * abaixo delas — e só abaixo, com a barra, para `/materiais-antigos` não
 * acender Materiais.
 */
export function activeTabHref(pathname: string): AccountTabHref {
  const below = ACCOUNT_TABS.slice(1).find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  );

  return below?.href ?? AFFILIATE_AREA_PATH;
}

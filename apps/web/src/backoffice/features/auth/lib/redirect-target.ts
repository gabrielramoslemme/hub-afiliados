import { DASHBOARD_PATH, LOGIN_PATH } from '@/backoffice/shared/routes';

/**
 * Para onde mandar a pessoa depois do login. O valor vem da query string — ou
 * seja, de quem montou o link —, e um destino não conferido aqui é
 * redirecionamento aberto: a página de phishing usa o nosso login de verdade e
 * despeja a vítima no domínio dela depois.
 *
 * Só passa caminho relativo dentro de `/admin/`. Tudo mais cai no dashboard.
 */
export function safeAdminTarget(raw: string | null | undefined): string {
  if (!raw) return DASHBOARD_PATH;

  // `//host` e `/\host` são absolutos na prática: o segundo porque parte dos
  // navegadores normaliza a barra invertida em barra antes de resolver a URL.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DASHBOARD_PATH;

  if (!raw.startsWith('/admin/')) return DASHBOARD_PATH;

  const [path] = raw.split('?');
  if (path === LOGIN_PATH) return DASHBOARD_PATH;

  return raw;
}

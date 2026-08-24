/**
 * Rotas da área do afiliado num módulo neutro, pelo mesmo motivo de
 * `admin-routes.ts`: o `middleware` roda no Edge e não pode arrastar
 * `@porto/contracts` nem nada `server-only` só para saber para onde mandar.
 */
export const AFFILIATE_LOGIN_PATH = '/entrar';
export const AFFILIATE_AREA_PATH = '/minha-conta';

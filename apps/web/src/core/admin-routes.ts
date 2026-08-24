/**
 * Rotas do painel num módulo neutro: o `middleware` roda no Edge e não pode
 * arrastar `@porto/contracts` nem nada marcado com `server-only` só para saber
 * para onde redirecionar.
 */
export const LOGIN_PATH = '/admin/login';
export const QUEUE_PATH = '/admin/afiliados';

/** Query string que carrega o destino original através do login. */
export const REDIRECT_PARAM = 'next';

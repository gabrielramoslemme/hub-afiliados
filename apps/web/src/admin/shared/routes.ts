/**
 * Rotas do painel num módulo neutro: o `middleware` roda no Edge e não pode
 * arrastar `@porto/contracts` nem nada marcado com `server-only` só para saber
 * para onde redirecionar.
 */
export const LOGIN_PATH = '/admin/login';
/**
 * A home do painel. É a raiz de `/admin` de propósito: quem entra cai na visão
 * geral, e a fila passa a ser um destino escolhido — não o lugar onde o login
 * larga todo mundo.
 */
export const DASHBOARD_PATH = '/admin';
export const QUEUE_PATH = '/admin/afiliados';

/**
 * Para onde a leitura manda quem a API recusou. Não é o login direto: o cookie
 * ainda está lá, e o `middleware` devolveria a pessoa para a fila — um laço de
 * redirecionamento. Quem apaga o cookie é o route handler deste caminho, que
 * então manda para o login.
 */
export const SESSION_EXPIRED_PATH = '/admin/sessao-expirada';

/** Query string que carrega o destino original através do login. */
export const REDIRECT_PARAM = 'next';

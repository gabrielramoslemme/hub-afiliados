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
export const CAMPAIGNS_PATH = '/admin/campanhas';

/**
 * Para onde a leitura manda quem a API recusou. Não é o login direto: o cookie
 * ainda está lá, e o `middleware` devolveria a pessoa para a fila — um laço de
 * redirecionamento. Quem apaga o cookie é o route handler deste caminho, que
 * então manda para o login.
 */
export const SESSION_EXPIRED_PATH = '/admin/sessao-expirada';

/** As duas telas da recuperação de senha do painel. Ver `isPanelPasswordPath`. */
export const FORGOT_PASSWORD_PATH = '/admin/esqueci-senha';
export const RESET_PASSWORD_PATH = '/admin/redefinir-senha';

/**
 * As telas de senha abrem **com ou sem** sessão, e é por isso que elas não
 * seguem a regra do login, que expulsa quem já entrou: o operador que clicou no
 * link do e-mail com a sessão aberta precisa chegar na tela: mandá-lo para o
 * dashboard engoliria o link, e ele não tem outro — o pedido seguinte invalida
 * o anterior.
 *
 * Duas telas nomeadas, nada de prefixo: isto é um furo na negação por omissão
 * da área logada, e o que ele NÃO abre importa tanto quanto o que abre.
 */
export function isPanelPasswordPath(pathname: string): boolean {
  return pathname === FORGOT_PASSWORD_PATH || pathname === RESET_PASSWORD_PATH;
}

/** Query string que carrega o destino original através do login. */
export const REDIRECT_PARAM = 'next';

/**
 * O ícone da aba do painel. O App Router o serve de dentro do próprio segmento,
 * em `/admin/icon-<hash>.svg`, e por isso ele nasce atrás do `middleware`, que
 * devolveria o HTML do login no lugar do SVG. O resultado seria aba sem ícone
 * justamente na tela de login, que é a única do painel que abre sem sessão.
 *
 * O `<hash>` é nome interno do Next, não contrato — daí ele ser opcional aqui:
 * se uma versão passar a servir `/admin/icon.svg`, a exceção continua de pé.
 *
 * É arquivo de marca, não dado: deixá-lo passar não conta nada a ninguém que a
 * própria tela de login pública já não conte. A regex é estreita de propósito —
 * um segmento só, nome fixo, extensão fixa —, porque isto é um furo na negação
 * por omissão da área logada e tem de caber num arquivo.
 */
const PANEL_ICON_PATH = /^\/admin\/icon(-[a-z0-9]+)?\.svg$/i;

export function isPanelIconPath(pathname: string): boolean {
  return PANEL_ICON_PATH.test(pathname);
}

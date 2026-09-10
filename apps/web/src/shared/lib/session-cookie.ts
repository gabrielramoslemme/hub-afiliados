/**
 * Módulo neutro de propósito: o `middleware` roda no Edge e não pode importar
 * nada marcado com `server-only`, mas precisa saber o nome do cookie.
 */
export const SESSION_COOKIE = 'porto_session';
export const SESSION_USER_COOKIE = 'porto_session_user';

/**
 * O cookie do operador só existe dentro do painel. Todo o painel mora sob
 * `/admin` — inclusive o login e o `sessao-expirada` —, então o navegador para
 * de anexar o token do operador na landing e no cadastro, que dividem origem
 * com ele. Não protege contra XSS, mas tira o token de alcance do script que
 * rodar na parte pública: `httpOnly` impede ler, o `path` impede gastar.
 *
 * O caminho fica aqui, junto do nome, porque cookie é identificado pelo par —
 * apagar com um sem o outro não apaga nada. E fica em `shared/` porque
 * `app/(admin)/**` e a feature de auth precisam do mesmo valor, sem que
 * `shared/` possa importar `@/admin/**`.
 *
 * O cookie do afiliado continua em `/`: `/entrar` e `/minha-conta` não
 * compartilham prefixo, e escopar na área deixaria o login sem enxergar a
 * sessão de quem já entrou.
 */
export const SESSION_COOKIE_PATH = '/admin';

/**
 * Transitório: o caminho em que o cookie do operador era gravado antes de ser
 * escopado. Quem estava logado na virada carrega o cookie antigo, e o `delete`
 * só alcança o par nome+caminho exato — sem apagar este também, essa sessão
 * fica presa num laço entre o login e o painel até o `maxAge` vencer.
 *
 * Pode sair oito horas depois de a mudança estar em produção, junto com os dois
 * `delete` que o usam.
 */
export const LEGACY_SESSION_COOKIE_PATH = '/';

/*
  O afiliado tem cookie próprio, e não o mesmo com outro conteúdo. É o que
  impede a sessão de um afiliado de valer como sessão de operador: o
  `middleware` de `/admin` só verifica que o cookie existe, então um nome
  compartilhado abriria o painel para quem entrou pela área do afiliado.
*/
export const AFFILIATE_SESSION_COOKIE = 'porto_affiliate_session';
export const AFFILIATE_SESSION_USER_COOKIE = 'porto_affiliate_session_user';

/** Oito horas: um turno de trabalho, não uma sessão eterna de backoffice. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

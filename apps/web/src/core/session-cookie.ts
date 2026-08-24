/**
 * Módulo neutro de propósito: o `middleware` roda no Edge e não pode importar
 * nada marcado com `server-only`, mas precisa saber o nome do cookie.
 */
export const SESSION_COOKIE = 'porto_session';
export const SESSION_USER_COOKIE = 'porto_session_user';

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

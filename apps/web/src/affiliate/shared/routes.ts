/**
 * Rotas da área do afiliado num módulo neutro, pelo mesmo motivo de
 * `admin-routes.ts`: o `middleware` roda no Edge e não pode arrastar
 * `@porto/contracts` nem nada `server-only` só para saber para onde mandar.
 */
export const AFFILIATE_LOGIN_PATH = '/entrar';
export const AFFILIATE_AREA_PATH = '/minha-conta';

/**
 * As duas telas da recuperação de senha, e a de criar a senha depois da
 * aprovação. Nenhuma passa pelo `middleware`: são públicas por natureza — quem
 * chega nelas não tem sessão, é justamente o que perdeu ou ainda não criou.
 */
export const AFFILIATE_FORGOT_PASSWORD_PATH = '/esqueci-senha';
export const AFFILIATE_RESET_PASSWORD_PATH = '/redefinir-senha';
export const AFFILIATE_SET_PASSWORD_PATH = '/definir-senha';

/**
 * Mesma razão do caminho equivalente no painel: mandar direto para o login com
 * o cookie vencido ainda no navegador faria o `middleware` devolver a pessoa
 * para a área, em laço. O route handler daqui apaga o cookie primeiro.
 */
export const AFFILIATE_SESSION_EXPIRED_PATH = '/minha-conta/sessao-expirada';

/**
 * As variáveis como o `ConfigService` as entrega: **depois** do Joi, com o
 * padrão aplicado e número e booleano já convertidos. É o `K` de
 * `ConfigService<EnvironmentVariables, true>` — leia sempre com
 * `get('CHAVE', { infer: true })`, que é o que tira o tipo daqui.
 *
 * Chave nova entra aqui e no `env.validation.ts` juntas.
 */
export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  /**
   * O Postgres do desenvolvimento não fala TLS; o RDS, com `rds.force_ssl = 1`,
   * não fala outra coisa. Quem liga é o `install-release.sh`.
   */
  DATABASE_SSL: boolean;
  /** Sem valor aqui, o caminho padrão é o que a imagem carrega. */
  DATABASE_CA_PATH?: string;
  JWT_SECRET: string;
  /**
   * Em segundos, a mesma unidade do cookie de sessão do painel, e o mesmo valor:
   * token que morre antes do cookie vira 401 numa tela que se acha logada.
   */
  JWT_EXPIRES_IN_SECONDS: number;
  APP_BASE_URL: string;
  PANEL_BASE_URL: string;
  MAIL_PROVIDER: 'resend' | 'logger';
  RESEND_API_KEY: string;
  /** Remetente e nome de exibição não são do fornecedor: valem em qualquer um. */
  MAIL_FROM_EMAIL: string;
  MAIL_FROM_NAME: string;
  PORTO_OAUTH_URL: string;
  PORTO_API_BASE_URL: string;
  /** O prefixo do produto no gateway, antes do `/v1` do INT-01. */
  PORTO_API_BASE_PATH: string;
  /** Em `test` chega vazia: o e2e troca o gateway pelo falso. */
  PORTO_CLIENT_ID: string;
  PORTO_CLIENT_SECRET: string;
  /**
   * O teto é curto de propósito: a aprovação espera esta chamada, e a analista
   * está olhando para um diálogo aberto. Melhor pedir para tentar de novo do
   * que segurar a tela.
   */
  PORTO_API_TIMEOUT_MS: number;
  /**
   * O segredo que a Porto usa para assinar o webhook de incentivos. Vazio, a
   * rota recusa toda chamada — nunca aceita assinatura feita com segredo vazio.
   */
  PORTO_WEBHOOK_SECRET: string;
  /**
   * Quanto o instante assinado pode se afastar do nosso relógio, para os dois
   * lados. É o que impede reenviar para sempre uma chamada capturada.
   */
  PORTO_WEBHOOK_TOLERANCE_SECONDS: number;
}

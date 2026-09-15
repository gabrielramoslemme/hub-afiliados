import * as Joi from 'joi';

/*
  A credencial em branco passa com o emissor falso e é recusada com o real. Sai
  numa constante porque as duas credenciais dividem a mesma condição — e porque
  assim a exceção do lint vive num lugar só.
*/
// biome-ignore lint/suspicious/noThenProperty: `then` é a chave da condicional do Joi, não um thenable
const REQUIRED_WITH_PORTO = { is: 'porto', then: Joi.string().required().disallow('') };

/*
  Fora de desenvolvimento e teste, o emissor não tem padrão. O falso num
  ambiente real manda ao afiliado, por e-mail, um cupom que a Porto não registrou
  — e herdar isso de um default, sem ninguém escolher, é o que esta regra fecha.
  Quem sobe um ambiente real sem credencial passa `fake` de propósito.
*/
const CHOSEN_OUTSIDE_DEVELOPMENT = {
  is: Joi.valid('staging', 'production'),
  // biome-ignore lint/suspicious/noThenProperty: `then` é a chave da condicional do Joi, não um thenable
  then: Joi.string().required(),
  otherwise: Joi.string().default('fake'),
};

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  // O Postgres local não fala TLS; o RDS, com `rds.force_ssl = 1`, não fala
  // outra coisa. `DATABASE_CA_PATH` só existe para apontar um bundle fora do
  // lugar padrão da imagem — em branco, vale o que o Dockerfile copiou.
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_CA_PATH: Joi.string().optional(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number().default(28800),
  APP_BASE_URL: Joi.string().uri().required(),
  PANEL_BASE_URL: Joi.string().uri().required(),
  MAIL_PROVIDER: Joi.string().valid('resend', 'logger').default('logger'),
  RESEND_API_KEY: Joi.string().allow('').default(''),
  MAIL_FROM_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .default('nao-responda@afiliados.porto.example'),
  MAIL_FROM_NAME: Joi.string().default('Hub de Afiliados'),

  // `fake` emite em memória e é o que permite desenvolver e rodar o e2e sem
  // credencial da Porto. As duas credenciais só são exigidas em `porto`.
  COUPON_PROVIDER: Joi.string().valid('porto', 'fake').when('NODE_ENV', CHOSEN_OUTSIDE_DEVELOPMENT),
  PORTO_OAUTH_URL: Joi.string()
    .uri()
    .default('https://hml.api.portoseguro.com.br/oauth/v2/access-token'),
  PORTO_API_BASE_URL: Joi.string().uri().default('https://portoapicloud-hml.portoseguro.com.br'),
  PORTO_API_BASE_PATH: Joi.string().default('/porto-assistencia/campanhasneo'),
  PORTO_CLIENT_ID: Joi.string().allow('').default('').when('COUPON_PROVIDER', REQUIRED_WITH_PORTO),
  PORTO_CLIENT_SECRET: Joi.string()
    .allow('')
    .default('')
    .when('COUPON_PROVIDER', REQUIRED_WITH_PORTO),
  PORTO_API_TIMEOUT_MS: Joi.number().default(10000),
});

import * as Joi from 'joi';

/*
  Fora de `test` a API sempre fala com a Porto, e sem credencial cada aprovação
  voltaria 503. Em `test` o e2e troca o gateway pelo falso antes de subir, então
  a credencial não teria uso ali. Sai numa constante porque as duas credenciais
  dividem a mesma condição — e porque assim a exceção do lint vive num lugar só.
*/
const REQUIRED_OUTSIDE_TEST = {
  is: 'test',
  // biome-ignore lint/suspicious/noThenProperty: `then` é a chave da condicional do Joi, não um thenable
  then: Joi.string().allow('').default(''),
  otherwise: Joi.string().required().disallow(''),
};

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
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

  PORTO_OAUTH_URL: Joi.string()
    .uri()
    .default('https://hml.api.portoseguro.com.br/oauth/v2/access-token'),
  PORTO_API_BASE_URL: Joi.string().uri().default('https://portoapicloud-hml.portoseguro.com.br'),
  PORTO_API_BASE_PATH: Joi.string().default('/porto-assistencia/campanhasneo'),
  PORTO_CLIENT_ID: Joi.string().when('NODE_ENV', REQUIRED_OUTSIDE_TEST),
  PORTO_CLIENT_SECRET: Joi.string().when('NODE_ENV', REQUIRED_OUTSIDE_TEST),
  PORTO_API_TIMEOUT_MS: Joi.number().default(10000),
});

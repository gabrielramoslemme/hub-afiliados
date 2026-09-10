import * as Joi from 'joi';

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
});

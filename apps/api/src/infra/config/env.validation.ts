import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number().default(28800),
  APP_BASE_URL: Joi.string().uri().required(),
  PANEL_BASE_URL: Joi.string().uri().required(),
  MAIL_PROVIDER: Joi.string().valid('mailersend', 'logger').default('logger'),
  MAILERSEND_API_KEY: Joi.string().allow('').default(''),
  MAILERSEND_FROM_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .default('nao-responda@afiliados.porto.example'),
  MAILERSEND_FROM_NAME: Joi.string().default('Hub de Afiliados'),
  MAILERSEND_TEMPLATE_REGISTRATION_RECEIVED: Joi.string().allow('').default(''),
  MAILERSEND_TEMPLATE_REGISTRATION_APPROVED: Joi.string().allow('').default(''),
  MAILERSEND_TEMPLATE_REGISTRATION_REJECTED: Joi.string().allow('').default(''),
  MAILERSEND_TEMPLATE_PASSWORD_RECOVERY: Joi.string().allow('').default(''),
});

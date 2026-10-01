import * as Joi from 'joi';

/*
  Fora de `test` a API sempre fala com a Porto, e sem credencial cada aprovação
  voltaria 503. Em `test` o e2e troca o gateway por um falso antes de subir,
  então as credenciais não teriam uso ali. Sai numa constante porque as duas
  dividem a mesma condição — e porque assim a exceção do lint vive num lugar só.
*/
const REQUIRED_OUTSIDE_TEST = {
  is: 'test',
  // biome-ignore lint/suspicious/noThenProperty: `then` é a chave da condicional do Joi, não um thenable
  then: Joi.string().allow('').default(''),
  otherwise: Joi.string().required().disallow(''),
};

const PORTO_HML_OAUTH_URL = 'https://portoapicloud-hml.portoseguro.com.br/oauth/v2/access-token';
const PORTO_HML_API_BASE_URL = 'https://portoapicloud-hml.portoseguro.com.br';

/*
  Padrão de homologação em produção faria a credencial de produção falar com
  HML: cada aprovação falharia sem dizer por quê. Lá o endereço vem sempre de
  fora, e sem ele a API não sobe. Os dois ambientes da AWS rodam com
  `NODE_ENV=production`, e por isso a stack escreve o endereço até no de dev.
*/
function requiredInProduction(fallback: string) {
  return {
    is: 'production',
    // biome-ignore lint/suspicious/noThenProperty: `then` é a chave da condicional do Joi, não um thenable
    then: Joi.required(),
    otherwise: Joi.optional().default(fallback),
  };
}

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
  // O Resend é o único jeito de mandar e-mail, mas a chave é opcional enquanto
  // a conta não existe: sem ela a API sobe e cada envio falha no log. Exigir
  // travaria o deploy inteiro por causa do e-mail.
  RESEND_API_KEY: Joi.string().allow('').default(''),
  MAIL_FROM_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .default('nao-responda@afiliados.porto.example'),
  MAIL_FROM_NAME: Joi.string().default('Hub de Afiliados'),

  // Fora de produção, homologação. Não é o host de OAuth da doc da Porto
  // (`hml.api.portoseguro.com.br`): esse não resolve em DNS público. O token
  // sai do próprio host da API, e é aceito.
  PORTO_OAUTH_URL: Joi.string().uri().when('NODE_ENV', requiredInProduction(PORTO_HML_OAUTH_URL)),
  PORTO_API_BASE_URL: Joi.string()
    .uri()
    .when('NODE_ENV', requiredInProduction(PORTO_HML_API_BASE_URL)),
  PORTO_API_BASE_PATH: Joi.string().default('/porto-assistencia/campanhasneo'),
  PORTO_CLIENT_ID: Joi.string().when('NODE_ENV', REQUIRED_OUTSIDE_TEST),
  PORTO_CLIENT_SECRET: Joi.string().when('NODE_ENV', REQUIRED_OUTSIDE_TEST),
  PORTO_API_TIMEOUT_MS: Joi.number().default(10000),

  // Vazio fecha o webhook de incentivos: toda chamada volta 401. Opcional de
  // propósito — obrigatório, derrubaria a subida de todo ambiente que ainda não
  // combinou o segredo com a Porto, e o que se quer ali é só a rota fechada.
  PORTO_WEBHOOK_SECRET: Joi.string().min(32).allow('').default(''),
  PORTO_WEBHOOK_TOLERANCE_SECONDS: Joi.number().integer().min(1).default(300),
});

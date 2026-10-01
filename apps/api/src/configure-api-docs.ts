import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EnvironmentVariables } from '@Infra/config/environment-variables';

/**
 * O Swagger em `/v1/docs`, só fora de produção. A API sai na internet pelo
 * CloudFront, e em produção o Swagger entregaria a quem pedisse o mapa de toda
 * rota, com os campos de cada DTO. O contrato continua publicado: o
 * `openapi.json` sai da CI, por `npm run openapi:generate`, e não daqui.
 */
export function configureApiDocs(app: INestApplication): void {
  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  if (configService.get('NODE_ENV', { infer: true }) === 'production') return;

  const config = new DocumentBuilder()
    .setTitle('Hub de Afiliados — API')
    .setDescription('Canais: /v1/affiliate (portal do afiliado), /v1/admin (painel), /v1/webhooks')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('v1/docs', app, SwaggerModule.createDocument(app, config));
}

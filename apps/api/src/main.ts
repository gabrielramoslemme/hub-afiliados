import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  // O corpo cru é o que a assinatura dos webhooks cobre: o JSON já lido não
  // devolve os mesmos bytes.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('Hub de Afiliados — API')
    .setDescription('Canais: /v1/affiliate (portal do afiliado), /v1/admin (painel), /v1/webhooks')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('v1/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(configService.get('PORT', { infer: true }));
}

void bootstrap();

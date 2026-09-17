import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { HttpExceptionFilter } from '@Infra/shared/filters/http-exception.filter';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: [configService.get('PANEL_BASE_URL', { infer: true })],
    credentials: true,
  });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Sem isso, um campo com vários decorators falhando manda uma mensagem
      // por decorator — mesmo quando todos dizem a mesma coisa.
      stopAtFirstError: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

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

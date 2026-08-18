import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { HttpExceptionFilter } from '@Infra/shared/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const env = app.get(EnvironmentVariableService);

  app.use(helmet());
  app.enableCors({ origin: [env.panelBaseUrl], credentials: true });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Hub de Afiliados — API')
    .setDescription('Canais: /v1/mobile (app do afiliado), /v1/admin (painel), /v1/webhooks')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('v1/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(env.port);
}

void bootstrap();

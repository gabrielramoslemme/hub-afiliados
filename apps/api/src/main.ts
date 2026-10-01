import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { AppModule } from './app.module';
import { configureApiDocs } from './configure-api-docs';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  // O corpo cru é o que a assinatura dos webhooks cobre: o JSON já lido não
  // devolve os mesmos bytes.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  configureApp(app);
  // O `docker stop` manda SIGTERM: sem os ganchos, o processo morre com e-mails
  // de recuperação ainda saindo, e o link nunca chega.
  app.enableShutdownHooks();
  configureApiDocs(app);

  await app.listen(configService.get('PORT', { infer: true }));
}

void bootstrap();

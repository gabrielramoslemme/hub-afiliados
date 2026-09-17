import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { HttpExceptionFilter } from '@Infra/shared/filters/http-exception.filter';

/**
 * O que faz a aplicação responder como responde: prefixo, validação e o corpo
 * de erro. Mora fora do `main.ts` porque o e2e não passa por ele — e cada spec
 * copiando essa configuração à mão já tinha divergido dela sem ninguém notar,
 * com teste de validação passando contra um pipe que produção não usa.
 */
export function configureApp(app: INestApplication): void {
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
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';

/**
 * Valida o ambiente na subida e publica o `ConfigService` para a aplicação
 * inteira (`isGlobal`). Quem lê injeta `ConfigService<EnvironmentVariables, true>`
 * — o `true` diz que o Joi já validou, e por isso `get` não devolve `undefined`.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
})
export class AppConfigModule {}

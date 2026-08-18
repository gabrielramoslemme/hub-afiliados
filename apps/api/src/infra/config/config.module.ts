import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import { EnvironmentVariableService } from './environment-variable.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
  providers: [EnvironmentVariableService],
  exports: [EnvironmentVariableService],
})
export class AppConfigModule {}

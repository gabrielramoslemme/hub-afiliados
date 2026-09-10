import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { buildPostgresSsl } from './postgres-ssl';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [EnvironmentVariableService],
      useFactory: (env: EnvironmentVariableService) => ({
        type: 'postgres' as const,
        url: env.databaseUrl,
        ssl: buildPostgresSsl(env.databaseSsl, env.databaseCaPath),
        entities: [`${__dirname}/entities/*.typeorm-entity{.ts,.js}`],
        migrations: [`${__dirname}/migrations/*{.ts,.js}`],
        synchronize: false,
        migrationsRun: false,
        logging: !env.isProduction ? ['error', 'warn'] : ['error'],
      }),
    }),
  ],
})
export class DatabaseModule {}

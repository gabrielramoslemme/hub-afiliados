import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { buildPostgresSsl } from './postgres-ssl';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        type: 'postgres' as const,
        url: configService.get('DATABASE_URL', { infer: true }),
        ssl: buildPostgresSsl(
          configService.get('DATABASE_SSL', { infer: true }),
          configService.get('DATABASE_CA_PATH', { infer: true }),
        ),
        entities: [`${__dirname}/entities/*.typeorm-entity{.ts,.js}`],
        migrations: [`${__dirname}/migrations/*{.ts,.js}`],
        synchronize: false,
        migrationsRun: false,
        logging:
          configService.get('NODE_ENV', { infer: true }) === 'production'
            ? ['error']
            : ['error', 'warn'],
      }),
    }),
  ],
})
export class DatabaseModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [EnvironmentVariableService],
      useFactory: (env: EnvironmentVariableService) => ({
        type: 'postgres' as const,
        url: env.databaseUrl,
        entities: [`${__dirname}/entities/*.entity{.ts,.js}`],
        migrations: [`${__dirname}/migrations/*{.ts,.js}`],
        synchronize: false,
        migrationsRun: false,
        logging: !env.isProduction ? ['error', 'warn'] : ['error'],
      }),
    }),
  ],
})
export class DatabaseModule {}

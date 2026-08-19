import { Module } from '@nestjs/common';
import { RepositoriesModule } from '@Infra/database/typeorm/repositories/repositories.module';

@Module({ imports: [RepositoriesModule] })
export class MobileModule {}

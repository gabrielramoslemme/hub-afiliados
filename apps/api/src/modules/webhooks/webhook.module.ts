import { Module } from '@nestjs/common';
import { SharedModule } from '@Modules/shared/shared.module';

@Module({ imports: [SharedModule] })
export class WebhookModule {}

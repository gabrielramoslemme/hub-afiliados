import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { WithdrawalReconciliationJob } from './withdrawal-reconciliation.job';

/*
  O e2e troca este módulo inteiro por um vazio (`createE2eTestingModule`): ele
  sobe um `AppModule` por spec, e um `CronJob` de verdade a cada um prende o
  Jest de pé no fim e deixa a suíte lenta demais. O `NODE_ENV==='test'` dentro
  do job continua ali, como segunda barreira.
*/
@Module({
  imports: [ScheduleModule.forRoot(), UseCasesModule],
  providers: [WithdrawalReconciliationJob],
})
export class JobsModule {}

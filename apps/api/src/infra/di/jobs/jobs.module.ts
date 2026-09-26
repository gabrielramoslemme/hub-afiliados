import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { UseCasesModule } from '@Infra/di/use-cases.module';
import { WithdrawalReconciliationJob } from './withdrawal-reconciliation.job';

/*
  `cronJobs: false` no teste. `forRoot` é estático — sem `ConfigService` ainda
  neste ponto —, e o e2e sobe um `AppModule` inteiro por spec: um `CronJob` de
  verdade a cada um (12 na suíte) prende o Jest de pé no fim e, mesmo fechando
  toda vez, deixa a suíte inteira lenta demais para rodar. O `NODE_ENV==='test'`
  dentro do job continua ali, como segunda barreira.
*/
@Module({
  imports: [ScheduleModule.forRoot({ cronJobs: process.env.NODE_ENV !== 'test' }), UseCasesModule],
  providers: [WithdrawalReconciliationJob],
})
export class JobsModule {}

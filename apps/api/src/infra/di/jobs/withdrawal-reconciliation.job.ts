import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { ReconcileWithdrawalsUseCase } from '@Application/withdrawals/reconcile-withdrawals.use-case';
import { EnvironmentVariables } from '@Infra/config/environment-variables';

/*
  Uma chave fixa de advisory lock, só desta rodada. Com dois containers de pé,
  os dois disparam o cron; quem não pega o lock não faz nada, e o fornecedor
  não recebe o mesmo pedido duas vezes na mesma rodada.
*/
const LOCK_KEY = 7_260_925;
const BATCH_SIZE = 50;

@Injectable()
export class WithdrawalReconciliationJob {
  private readonly logger = new Logger(WithdrawalReconciliationJob.name);

  constructor(
    private readonly reconcileWithdrawalsUseCase: ReconcileWithdrawalsUseCase,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run(): Promise<void> {
    // O e2e troca o banco a cada spec com `TRUNCATE`; uma rodada no meio dele
    // leria linhas pela metade.
    if (this.configService.get('NODE_ENV', { infer: true }) === 'test') return;

    // O advisory lock é da sessão: pegar e soltar tem de ser na mesma conexão.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const [{ locked }] = await queryRunner.query('SELECT pg_try_advisory_lock($1) AS "locked"', [
        LOCK_KEY,
      ]);
      if (!locked) return;

      try {
        const result = await this.reconcileWithdrawalsUseCase.execute({
          retryAfterMinutes: this.configService.get('WITHDRAWAL_RETRY_AFTER_MINUTES', {
            infer: true,
          }),
          staleAfterMinutes: this.configService.get('WITHDRAWAL_STALE_AFTER_MINUTES', {
            infer: true,
          }),
          limit: BATCH_SIZE,
        });

        if (result.retried || result.settled) {
          this.logger.log(
            `Reconciliação: ${result.retried} reenviado(s), ${result.settled} liquidado(s)`,
          );
        }
      } finally {
        await queryRunner.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
      }
    } catch (error) {
      // Rodada que falha não derruba a API: a próxima tenta de novo.
      this.logger.error('Falha na reconciliação dos saques', (error as Error)?.stack);
    } finally {
      await queryRunner.release();
    }
  }
}

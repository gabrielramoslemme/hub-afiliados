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

/**
 * `QueryRunner.release()`, da interface pública do TypeORM, não aceita erro —
 * sempre devolve a conexão ao pool. `releasePostgresConnection(error)` é o
 * método por baixo dela, da classe concreta do driver Postgres (não declarado
 * na interface, só na implementação que `createQueryRunner()` devolve quando o
 * driver é Postgres — o nosso caso aqui, que já fala SQL de advisory lock direto):
 * passar um erro a ele descarta a conexão em vez de devolvê-la ao pool.
 */
interface DestroyableQueryRunner {
  releasePostgresConnection(error?: Error): Promise<void>;
}

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

    // Verdadeiro só quando nem o unlock nem o `unlock_all` de socorro
    // confirmaram que a sessão soltou o lock — a conexão não pode voltar ao
    // pool nesse estado, ou toda rodada futura que a pegasse leria
    // `pg_try_advisory_lock` como falso para sempre.
    let sessionMayStillHoldTheLock = false;

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
        // Só o `publicId`: é o que a regra deixa passar. A lista junta falha
        // imprevista, repetição recusada e desfecho divergente — o runbook do
        // `TRANSFEERA-webhook.md` diz o que conferir em cada caso.
        if (result.failed.length > 0) {
          this.logger.error(`Reconciliação: conferir à mão ${result.failed.join(', ')}`);
        }
      } finally {
        try {
          await queryRunner.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
        } catch (unlockError) {
          this.logger.error(
            'Falha ao soltar o advisory lock da reconciliação',
            (unlockError as Error)?.stack,
          );
          try {
            // A conexão é dedicada só a este lock: soltar todos os que a
            // sessão ainda segure é seguro, e mais simples que descobrir se o
            // id certo ainda está preso.
            await queryRunner.query('SELECT pg_advisory_unlock_all()');
          } catch (fallbackError) {
            this.logger.error(
              'Falha ao soltar todos os advisory locks da sessão; a conexão será descartada',
              (fallbackError as Error)?.stack,
            );
            sessionMayStillHoldTheLock = true;
          }
        }
      }
    } catch (error) {
      // Rodada que falha não derruba a API: a próxima tenta de novo.
      this.logger.error('Falha na reconciliação dos saques', (error as Error)?.stack);
    } finally {
      if (sessionMayStillHoldTheLock) {
        await (queryRunner as unknown as DestroyableQueryRunner).releasePostgresConnection(
          new Error('Advisory lock da reconciliação pode ter ficado preso na conexão.'),
        );
      } else {
        await queryRunner.release();
      }
    }
  }
}

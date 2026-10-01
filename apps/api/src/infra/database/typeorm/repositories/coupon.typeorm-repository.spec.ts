import type { DataSource, Repository } from 'typeorm';
import { CouponChangeInProgressError } from '@Domain/coupons/coupons.errors';
import type { CouponTypeormEntity } from '@Infra/database/typeorm/entities/coupon.typeorm-entity';
import { CouponTypeormRepository } from './coupon.typeorm-repository';

/*
  A exclusividade em si — duas alterações do mesmo cupom em fila — é do e2e, com
  o Postgres de verdade. Aqui fica o que o e2e não alcança sem esperar o tempo
  limite inteiro: a espera longa vira erro de domínio, e a conexão volta ao pool.
*/
describe('CouponTypeormRepository.runExclusive', () => {
  const LOCK_NOT_AVAILABLE = '55P03';

  type FakeQueryRunner = Record<
    | 'connect'
    | 'startTransaction'
    | 'commitTransaction'
    | 'rollbackTransaction'
    | 'release'
    | 'query',
    jest.Mock
  >;

  function repositoryWith(queryRunner: FakeQueryRunner): CouponTypeormRepository {
    const dataSource = { createQueryRunner: () => queryRunner } as unknown as DataSource;

    return new CouponTypeormRepository({} as Repository<CouponTypeormEntity>, dataSource);
  }

  function queryRunnerWaitingTooLong(): FakeQueryRunner {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(async (sql: string) => {
        if (sql.includes('pg_advisory_lock')) {
          throw Object.assign(new Error('canceling statement due to lock timeout'), {
            code: LOCK_NOT_AVAILABLE,
          });
        }
        return [];
      }),
    };
  }

  /*
    Sem o tempo limite, cada alteração esperando segura uma conexão do pool; com
    o pool cheio delas, a que tem a vez não consegue outra para gravar, e
    ninguém anda.
  */
  it('gives up a wait that runs past the limit without running the work', async () => {
    const work = jest.fn();

    await expect(repositoryWith(queryRunnerWaitingTooLong()).runExclusive(7, work)).rejects.toThrow(
      CouponChangeInProgressError,
    );
    expect(work).not.toHaveBeenCalled();
  });

  it('hands the connection back to the pool after giving up', async () => {
    const queryRunner = queryRunnerWaitingTooLong();

    await repositoryWith(queryRunner)
      .runExclusive(7, jest.fn())
      .catch(() => undefined);

    expect(queryRunner.release).toHaveBeenCalled();
  });
});

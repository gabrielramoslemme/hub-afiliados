import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type QueryRunner, Repository } from 'typeorm';
import { AuditEntityEnum } from '@porto/contracts';
import { CouponEntity } from '@Domain/coupons/coupon.entity';
import { ChangeCouponRecordInput, CouponRepository } from '@Domain/coupons/coupon.repository';
import { CouponChangeInProgressError } from '@Domain/coupons/coupons.errors';
import { CouponTypeormEntity } from '@Infra/database/typeorm/entities/coupon.typeorm-entity';
import { recordAuditLog } from './record-audit-log';

/*
  Primeira chave do lock consultivo de dois inteiros: separa os locks de cupom
  de qualquer outro que nasça no banco com a mesma segunda chave. A segunda é o
  `id` do cupom.
*/
const COUPON_LOCK_NAMESPACE = 1_001;
const LOCK_NOT_AVAILABLE = '55P03';
/*
  Maior que uma alteração inteira na Porto — token renovado e repetição incluídos
  —, para quem espera na fila não desistir de uma que só está lenta. O limite
  existe porque cada espera segura uma conexão do pool: com o pool cheio delas,
  a alteração que tem a vez não teria outra para gravar.
*/
const LOCK_TIMEOUT = '30s';

@Injectable()
export class CouponTypeormRepository implements CouponRepository {
  constructor(
    @InjectRepository(CouponTypeormEntity)
    private readonly repository: Repository<CouponTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  findByCode(code: string): Promise<CouponEntity | null> {
    return this.repository.findOne({ where: { code } });
  }

  change(input: ChangeCouponRecordInput): Promise<CouponEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      // O lock garante que o "antes" gravado na trilha é o que valia quando a
      // mudança entrou, e não o de uma leitura que outra alteração já envelheceu.
      const coupon = await manager.findOne(CouponTypeormEntity, {
        where: { id: input.couponId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!coupon) return null;

      const before = { status: coupon.status, discountPercent: coupon.discountPercent };

      // Ausente é "não mexe nesta coluna": copiar só o que veio impede que um
      // `undefined` vire `NULL` numa coluna que não aceita.
      if (input.discountPercent !== undefined) coupon.discountPercent = input.discountPercent;
      if (input.status !== undefined) coupon.status = input.status;

      const saved = await manager.save(coupon);

      await recordAuditLog(
        manager,
        { entity: AuditEntityEnum.COUPON, entityId: coupon.id, actorUserId: input.actorUserId },
        before,
        { status: saved.status, discountPercent: saved.discountPercent },
      );

      return saved;
    });
  }

  /*
    Lock consultivo de sessão, numa conexão só dele: ele atravessa a chamada à
    Porto, que não cabe dentro de uma transação, e a escrita do `change`, que
    abre a própria. O `finally` devolve o lock mesmo quando a Porto recusa.
  */
  async runExclusive<T>(couponId: number, work: () => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await this.acquireCouponLock(queryRunner, couponId);
    } catch (error) {
      await queryRunner.release();
      throw error;
    }

    try {
      return await work();
    } finally {
      await this.releaseCouponLock(queryRunner, couponId);
    }
  }

  private async acquireCouponLock(queryRunner: QueryRunner, couponId: number): Promise<void> {
    // `SET LOCAL` morre com a transação, e a conexão volta ao pool sem ele. O
    // lock de sessão, não: fica com a conexão depois do commit.
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`SET LOCAL lock_timeout = '${LOCK_TIMEOUT}'`);
      await queryRunner.query('SELECT pg_advisory_lock($1, $2)', [COUPON_LOCK_NAMESPACE, couponId]);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw (error as { code?: string }).code === LOCK_NOT_AVAILABLE
        ? new CouponChangeInProgressError()
        : error;
    }
  }

  private async releaseCouponLock(queryRunner: QueryRunner, couponId: number): Promise<void> {
    try {
      await queryRunner.query('SELECT pg_advisory_unlock($1, $2)', [
        COUPON_LOCK_NAMESPACE,
        couponId,
      ]);
    } finally {
      // Destravar só falha com a conexão quebrada, e aí o pool a descarta e o
      // Postgres solta o lock com a sessão. Se um dia falhar com ela de pé, o
      // tempo limite é o que impede a próxima alteração de esperar para sempre.
      await queryRunner.release();
    }
  }
}

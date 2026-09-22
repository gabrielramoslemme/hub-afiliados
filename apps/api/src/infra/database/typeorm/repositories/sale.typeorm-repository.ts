import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { IncentiveStatusEnum } from '@porto/contracts';
import { IncentiveEventOutcomeEnum } from '@Domain/sales/incentive-event.entity';
import { SaleEntity } from '@Domain/sales/sale.entity';
import { RegisterSaleInput, SaleRepository, SettleSaleInput } from '@Domain/sales/sale.repository';
import { IncentiveEventTypeormEntity } from '@Infra/database/typeorm/entities/incentive-event.typeorm-entity';
import { SaleTypeormEntity } from '@Infra/database/typeorm/entities/sale.typeorm-entity';

@Injectable()
export class SaleTypeormRepository implements SaleRepository {
  constructor(
    @InjectRepository(SaleTypeormEntity)
    private readonly repository: Repository<SaleTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  findByExternalId(externalId: string): Promise<SaleEntity | null> {
    return this.repository.findOne({ where: { externalId } });
  }

  register({ event, ...sale }: RegisterSaleInput): Promise<SaleEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      // `ON CONFLICT DO NOTHING` em vez de capturar o erro do índice único: o
      // erro abortaria a transação, e quem perdeu a corrida só precisa saber
      // que perdeu.
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(SaleTypeormEntity)
        .values({ ...sale, incentiveStatus: IncentiveStatusEnum.PENDING, settledAt: null })
        .orIgnore()
        .returning('id')
        .execute();

      const [row] = inserted.raw as Array<{ id: number }>;
      if (!row) return null;
      const saleId = row.id;

      await manager.save(IncentiveEventTypeormEntity, {
        ...event,
        saleId,
        outcome: IncentiveEventOutcomeEnum.APPLIED,
        rejectionCode: null,
      });

      return manager.findOneByOrFail(SaleTypeormEntity, { id: saleId });
    });
  }

  settle({ saleId, toStatus, settledAt, event }: SettleSaleInput): Promise<SaleEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      // O use case leu a venda pendente sem lock; é aqui, travada, que se
      // confere se ela continua pendente — senão duas conclusões opostas
      // simultâneas encerrariam a mesma venda duas vezes.
      const sale = await manager.findOne(SaleTypeormEntity, {
        where: { id: saleId },
        lock: { mode: 'pessimistic_write' },
      });

      if (sale?.incentiveStatus !== IncentiveStatusEnum.PENDING) return null;

      sale.incentiveStatus = toStatus;
      sale.settledAt = settledAt;
      const saved = await manager.save(sale);

      await manager.save(IncentiveEventTypeormEntity, {
        ...event,
        saleId,
        outcome: IncentiveEventOutcomeEnum.APPLIED,
        rejectionCode: null,
      });

      return saved;
    });
  }
}

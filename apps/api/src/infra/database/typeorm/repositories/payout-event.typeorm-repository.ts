import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutEventEntity } from '@Domain/withdrawals/payout-event.entity';
import {
  PayoutEventRepository,
  RecordStandalonePayoutEventInput,
} from '@Domain/withdrawals/payout-event.repository';
import { PayoutEventTypeormEntity } from '@Infra/database/typeorm/entities/payout-event.typeorm-entity';

@Injectable()
export class PayoutEventTypeormRepository implements PayoutEventRepository {
  constructor(
    @InjectRepository(PayoutEventTypeormEntity)
    private readonly repository: Repository<PayoutEventTypeormEntity>,
  ) {}

  async record(input: RecordStandalonePayoutEventInput): Promise<void> {
    // `save`, e não `insert`: o tipo do `insert` trata o objeto da coluna
    // `jsonb` como entidade aninhada e recusa o `payload`.
    await this.repository.save(this.repository.create(input));
  }

  async listByWithdrawal(withdrawalId: number): Promise<PayoutEventEntity[]> {
    const rows = await this.repository.find({
      where: { withdrawalId },
      order: { receivedAt: 'ASC', id: 'ASC' },
    });

    return rows.map(({ withdrawal: _withdrawal, ...event }) => event);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IncentiveEventRepository,
  RecordIncentiveEventInput,
} from '@Domain/sales/incentive-event.repository';
import { IncentiveEventTypeormEntity } from '@Infra/database/typeorm/entities/incentive-event.typeorm-entity';

@Injectable()
export class IncentiveEventTypeormRepository implements IncentiveEventRepository {
  constructor(
    @InjectRepository(IncentiveEventTypeormEntity)
    private readonly repository: Repository<IncentiveEventTypeormEntity>,
  ) {}

  async record(input: RecordIncentiveEventInput): Promise<void> {
    await this.repository.save(input);
  }
}

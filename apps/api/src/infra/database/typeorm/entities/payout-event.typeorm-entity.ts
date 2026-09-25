import {
  Column,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PayoutEventOutcomeEnum, PayoutEventSourceEnum } from '@porto/contracts';
import { PayoutEventEntity } from '@Domain/withdrawals/payout-event.entity';
import { WithdrawalTypeormEntity } from './withdrawal.typeorm-entity';

@Entity('payout_events')
@Index('ix_payout_events_withdrawal', ['withdrawalId', 'receivedAt'])
export class PayoutEventTypeormEntity implements PayoutEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ type: 'varchar', length: 20 })
  source: PayoutEventSourceEnum;

  @Column({ name: 'event_id', type: 'varchar', length: 100, nullable: true })
  eventId: string | null;

  @Column({ name: 'withdrawal_id', type: 'int', nullable: true })
  withdrawalId: number | null;

  @ManyToOne(() => WithdrawalTypeormEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'withdrawal_id',
    foreignKeyConstraintName: 'payout_events_withdrawal_id_fkey',
  })
  withdrawal: WithdrawalTypeormEntity | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Column({ name: 'provider_status', type: 'varchar', length: 30, nullable: true })
  providerStatus: string | null;

  @Column({ type: 'varchar', length: 20 })
  outcome: PayoutEventOutcomeEnum;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;
}

import {
  Check,
  Column,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncentiveErrorCodeEnum } from '@porto/contracts';
import {
  IncentiveEventEntity,
  IncentiveEventOutcomeEnum,
  IncentiveEventTypeEnum,
} from '@Domain/sales/incentive-event.entity';
import { SaleTypeormEntity } from './sale.typeorm-entity';

@Entity('porto_incentive_events')
@Index('ux_porto_incentive_events_applied', ['externalSaleId', 'eventType'], {
  unique: true,
  where: `"outcome" = 'APPLIED'`,
})
@Index('ix_porto_incentive_events_external_sale', ['externalSaleId', 'receivedAt'])
@Index('ix_porto_incentive_events_event', ['eventId'])
@Check(
  'ck_porto_incentive_events_rejection_code',
  `("outcome" = 'REJECTED') = ("rejection_code" IS NOT NULL)`,
)
export class IncentiveEventTypeormEntity implements IncentiveEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ name: 'event_id', type: 'varchar', length: 100 })
  eventId: string;

  @Column({ name: 'sale_id', type: 'int', nullable: true })
  saleId: number | null;

  @ManyToOne(() => SaleTypeormEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'sale_id',
    foreignKeyConstraintName: 'porto_incentive_events_sale_id_fkey',
  })
  sale: SaleTypeormEntity | null;

  @Column({ name: 'external_sale_id', type: 'varchar', length: 100 })
  externalSaleId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 30 })
  eventType: IncentiveEventTypeEnum;

  @Column({ type: 'varchar', length: 20 })
  outcome: IncentiveEventOutcomeEnum;

  @Column({ name: 'rejection_code', type: 'varchar', length: 20, nullable: true })
  rejectionCode: IncentiveErrorCodeEnum | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;
}

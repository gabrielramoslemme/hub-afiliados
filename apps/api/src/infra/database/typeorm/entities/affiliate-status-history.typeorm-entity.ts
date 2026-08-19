import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AffiliateStatusEnum } from '@porto/contracts';
import { AffiliateStatusHistoryEntity } from '@Domain/affiliates/affiliate-status-history.entity';
import { AffiliateTypeormEntity } from './affiliate.typeorm-entity';
import { UserTypeormEntity } from './user.typeorm-entity';

@Entity('affiliate_status_history')
@Index('ix_affiliate_status_history_affiliate', ['affiliateId', 'createdAt'])
export class AffiliateStatusHistoryTypeormEntity implements AffiliateStatusHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'affiliate_id', type: 'int' })
  affiliateId: number;

  @ManyToOne(() => AffiliateTypeormEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'affiliate_id',
    foreignKeyConstraintName: 'affiliate_status_history_affiliate_id_fkey',
  })
  affiliate: AffiliateTypeormEntity;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: AffiliateStatusEnum | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: AffiliateStatusEnum;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId: number | null;

  @ManyToOne(() => UserTypeormEntity, { nullable: true })
  @JoinColumn({
    name: 'actor_user_id',
    foreignKeyConstraintName: 'affiliate_status_history_actor_user_id_fkey',
  })
  actor: UserTypeormEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

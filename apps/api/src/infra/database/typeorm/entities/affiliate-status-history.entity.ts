import { AffiliateStatusEnum } from '@porto/contracts';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AffiliateEntity } from './affiliate.entity';
import { UserEntity } from './user.entity';

@Entity('affiliate_status_history')
export class AffiliateStatusHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'affiliate_id', type: 'int' })
  affiliateId: number;

  @ManyToOne(() => AffiliateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: AffiliateEntity;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: AffiliateStatusEnum | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: AffiliateStatusEnum;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CouponStatusEnum } from '@porto/contracts';
import { CouponHistoryEntity } from '@Domain/coupons/coupon-history.entity';
import { CouponTypeormEntity } from './coupon.typeorm-entity';
import { UserTypeormEntity } from './user.typeorm-entity';

@Entity('affiliate_coupon_history')
@Index('ix_affiliate_coupon_history_coupon', ['couponId', 'createdAt'])
export class CouponHistoryTypeormEntity implements CouponHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId: number;

  @ManyToOne(() => CouponTypeormEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'coupon_id',
    foreignKeyConstraintName: 'affiliate_coupon_history_coupon_id_fkey',
  })
  coupon: CouponTypeormEntity;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: CouponStatusEnum | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: CouponStatusEnum;

  @Column({ name: 'from_discount_percent', type: 'smallint', nullable: true })
  fromDiscountPercent: number | null;

  @Column({ name: 'to_discount_percent', type: 'smallint' })
  toDiscountPercent: number;

  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId: number | null;

  @ManyToOne(() => UserTypeormEntity, { nullable: true })
  @JoinColumn({
    name: 'actor_user_id',
    foreignKeyConstraintName: 'affiliate_coupon_history_actor_user_id_fkey',
  })
  actor: UserTypeormEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

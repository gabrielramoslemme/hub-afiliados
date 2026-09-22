import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IncentiveStatusEnum } from '@porto/contracts';
import { SaleEntity } from '@Domain/sales/sale.entity';
import { CouponTypeormEntity } from './coupon.typeorm-entity';

@Entity('affiliate_sales')
@Index('ix_affiliate_sales_coupon', ['couponId', 'registeredAt'])
@Check('ck_affiliate_sales_amount_cents', '"amount_cents" >= 0')
@Check('ck_affiliate_sales_settled_at', `("incentive_status" = 'PENDING') = ("settled_at" IS NULL)`)
export class SaleTypeormEntity implements SaleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId: number;

  @ManyToOne(() => CouponTypeormEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'coupon_id', foreignKeyConstraintName: 'affiliate_sales_coupon_id_fkey' })
  coupon: CouponTypeormEntity;

  @Column({ name: 'external_id', type: 'varchar', length: 100, unique: true })
  externalId: string;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ type: 'text' })
  item: string;

  @Column({ name: 'incentive_status', type: 'varchar', length: 20 })
  incentiveStatus: IncentiveStatusEnum;

  @Column({ name: 'registered_at', type: 'timestamptz' })
  registeredAt: Date;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

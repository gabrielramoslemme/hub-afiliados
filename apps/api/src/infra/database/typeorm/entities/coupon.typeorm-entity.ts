import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CouponStatusEnum } from '@porto/contracts';
import { CouponEntity } from '@Domain/coupons/coupon.entity';
import { AffiliateTypeormEntity } from './affiliate.typeorm-entity';

@Entity('affiliate_coupons')
@Check(
  'ck_affiliate_coupons_discount_percent',
  `"discount_percent" > 0 AND "discount_percent" <= 25`,
)
export class CouponTypeormEntity implements CouponEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  /** Um afiliado, um cupom: é o que o programa promete a quem divulga. */
  @Column({ name: 'affiliate_id', type: 'int', unique: true })
  affiliateId: number;

  @OneToOne(
    () => AffiliateTypeormEntity,
    (affiliate) => affiliate.coupon,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({
    name: 'affiliate_id',
    foreignKeyConstraintName: 'affiliate_coupons_affiliate_id_fkey',
  })
  affiliate: AffiliateTypeormEntity;

  /**
   * O INT-01 aceita 200 caracteres, e a coluna acompanha o teto deles — a regra
   * mais estreita de 4 a 20 é de produto, e mora em `coupon-code.util.ts`.
   */
  @Column({ type: 'varchar', length: 200, unique: true })
  code: string;

  @Column({ name: 'discount_percent', type: 'smallint' })
  discountPercent: number;

  @Column({ type: 'varchar', length: 20, default: CouponStatusEnum.ACTIVE })
  status: CouponStatusEnum;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

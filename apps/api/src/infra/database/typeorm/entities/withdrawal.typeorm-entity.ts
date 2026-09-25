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
import { PixKeyTypeEnum, WithdrawalStatusEnum } from '@porto/contracts';
import { WithdrawalEntity } from '@Domain/withdrawals/withdrawal.entity';
import { AffiliateTypeormEntity } from './affiliate.typeorm-entity';

@Entity('affiliate_withdrawals')
@Index('ix_affiliate_withdrawals_affiliate', ['affiliateId', 'requestedAt'])
@Index('ix_affiliate_withdrawals_open', ['status', 'updatedAt'], {
  where: `"status" IN ('REQUESTED', 'PROCESSING')`,
})
@Index('ix_affiliate_withdrawals_requested', ['requestedAt'])
@Check('ck_affiliate_withdrawals_amount_cents', '"amount_cents" > 0')
@Check(
  'ck_affiliate_withdrawals_paid_at',
  `("status" <> 'PAID' OR "paid_at" IS NOT NULL)
             AND ("paid_at" IS NULL OR "status" IN ('PAID', 'RETURNED'))`,
)
@Check('ck_affiliate_withdrawals_failed_at', `("status" = 'FAILED') = ("failed_at" IS NOT NULL)`)
@Check(
  'ck_affiliate_withdrawals_returned_at',
  `("status" = 'RETURNED') = ("returned_at" IS NOT NULL)`,
)
export class WithdrawalTypeormEntity implements WithdrawalEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ name: 'affiliate_id', type: 'int' })
  affiliateId: number;

  @ManyToOne(() => AffiliateTypeormEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'affiliate_id',
    foreignKeyConstraintName: 'affiliate_withdrawals_affiliate_id_fkey',
  })
  affiliate: AffiliateTypeormEntity;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ type: 'varchar', length: 20 })
  status: WithdrawalStatusEnum;

  @Column({ name: 'pix_key_type', type: 'varchar', length: 10 })
  pixKeyType: PixKeyTypeEnum;

  @Column({ name: 'pix_key', type: 'varchar', length: 140 })
  pixKey: string;

  @Column({ name: 'provider_batch_id', type: 'varchar', length: 50, nullable: true })
  providerBatchId: string | null;

  @Column({ name: 'provider_transfer_id', type: 'varchar', length: 50, nullable: true })
  providerTransferId: string | null;

  @Column({ name: 'end_to_end_id', type: 'varchar', length: 100, nullable: true })
  endToEndId: string | null;

  @Column({ name: 'receipt_url', type: 'text', nullable: true })
  receiptUrl: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AffiliateStatusEnum, type PixKeyTypeEnum, type SocialNetworkEnum } from '@porto/contracts';
import { AffiliateEntity } from '@Domain/affiliates/affiliate.entity';
import { UserTypeormEntity } from './user.typeorm-entity';

@Entity('affiliates')
@Index('ix_affiliates_status', ['status'])
@Index('ix_affiliates_created_at', ['createdAt'])
@Check('ck_affiliates_rejection_reason', `"status" <> 'REJECTED' OR "rejection_reason" IS NOT NULL`)
@Check('ck_affiliates_social_pair', `("social_network" IS NULL) = ("social_handle" IS NULL)`)
export class AffiliateTypeormEntity implements AffiliateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId: number;

  @OneToOne(
    () => UserTypeormEntity,
    (user) => user.affiliate,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'affiliates_user_id_fkey' })
  user: UserTypeormEntity;

  @Column({ type: 'varchar', length: 11, unique: true })
  cpf: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  rg: string;

  @Column({ name: 'pix_key_type', type: 'varchar', length: 10 })
  pixKeyType: PixKeyTypeEnum;

  @Column({ name: 'pix_key', type: 'varchar', length: 140 })
  pixKey: string;

  @Column({ name: 'social_network', type: 'varchar', length: 20, nullable: true })
  socialNetwork: SocialNetworkEnum | null;

  @Column({ name: 'social_handle', type: 'varchar', length: 30, nullable: true })
  socialHandle: string | null;

  @Column({ type: 'varchar', length: 20, default: AffiliateStatusEnum.PENDING_APPROVAL })
  status: AffiliateStatusEnum;

  @Column({ name: 'terms_accepted_at', type: 'timestamptz' })
  termsAcceptedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by_user_id', type: 'int', nullable: true })
  approvedByUserId: number | null;

  @ManyToOne(() => UserTypeormEntity, { nullable: true })
  @JoinColumn({
    name: 'approved_by_user_id',
    foreignKeyConstraintName: 'affiliates_approved_by_user_id_fkey',
  })
  approvedBy: UserTypeormEntity | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

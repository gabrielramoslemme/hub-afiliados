import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AffiliateStatusEnum, type PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateEntity } from '@Domain/affiliates/affiliate.entity';
import { TermsVersionTypeormEntity } from './terms-version.typeorm-entity';
import { UserTypeormEntity } from './user.typeorm-entity';

@Entity('affiliates')
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
  )
  @JoinColumn({ name: 'user_id' })
  user: UserTypeormEntity;

  @Column({ type: 'varchar', length: 11, unique: true })
  cpf: string;

  @Column({ name: 'pix_key_type', type: 'varchar', length: 10 })
  pixKeyType: PixKeyTypeEnum;

  @Column({ name: 'pix_key', type: 'varchar', length: 140 })
  pixKey: string;

  @Column({ type: 'varchar', length: 20, default: AffiliateStatusEnum.PENDING_APPROVAL })
  status: AffiliateStatusEnum;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by_user_id', type: 'int', nullable: true })
  approvedByUserId: number | null;

  @ManyToOne(() => UserTypeormEntity, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy: UserTypeormEntity | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'terms_version_id', type: 'int' })
  termsVersionId: number;

  @ManyToOne(() => TermsVersionTypeormEntity)
  @JoinColumn({ name: 'terms_version_id' })
  termsVersion: TermsVersionTypeormEntity;

  @Column({ name: 'terms_accepted_at', type: 'timestamptz' })
  termsAcceptedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

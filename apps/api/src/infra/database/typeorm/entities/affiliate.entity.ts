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
import { TermsVersionEntity } from './terms-version.entity';
import { UserEntity } from './user.entity';

@Entity('affiliates')
export class AffiliateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId: number;

  @OneToOne(
    () => UserEntity,
    (user) => user.affiliate,
  )
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

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

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy: UserEntity | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'terms_version_id', type: 'int' })
  termsVersionId: number;

  @ManyToOne(() => TermsVersionEntity)
  @JoinColumn({ name: 'terms_version_id' })
  termsVersion: TermsVersionEntity;

  @Column({ name: 'terms_accepted_at', type: 'timestamptz' })
  termsAcceptedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

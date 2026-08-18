import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Generated, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { AffiliateEntity } from './affiliate.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'citext', unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ name: 'password_set_at', type: 'timestamptz', nullable: true })
  passwordSetAt: Date | null;

  @Column({ name: 'should_change_password', type: 'boolean', default: false })
  shouldChangePassword: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20 })
  type: UserTypeEnum;

  @Column({ type: 'varchar', length: 30, nullable: true })
  role: UserRoleEnum | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;

  @OneToOne(() => AffiliateEntity, (affiliate) => affiliate.user)
  affiliate?: AffiliateEntity | null;
}

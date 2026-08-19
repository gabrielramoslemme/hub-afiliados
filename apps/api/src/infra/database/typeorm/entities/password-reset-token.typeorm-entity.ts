import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TokenPurposeEnum } from '@porto/contracts';
import { PasswordResetTokenEntity } from '@Domain/auth/password-reset-token.entity';
import { UserTypeormEntity } from './user.typeorm-entity';

@Entity('password_reset_tokens')
@Index('ix_password_reset_tokens_user_purpose', ['userId', 'purpose'], {
  where: '"used_at" IS NULL',
})
export class PasswordResetTokenTypeormEntity implements PasswordResetTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => UserTypeormEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'password_reset_tokens_user_id_fkey' })
  user: UserTypeormEntity;

  /** SHA-256 do token. O valor em claro só existe no e-mail enviado ao usuário. */
  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({ type: 'varchar', length: 20 })
  purpose: TokenPurposeEnum;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

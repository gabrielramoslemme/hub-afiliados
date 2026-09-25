import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditChangeTypeEnum, AuditEntityEnum } from '@porto/contracts';
import { AuditDiff, AuditLogEntity } from '@Domain/audit/audit-log.entity';
import { UserTypeormEntity } from './user.typeorm-entity';

@Entity('audit_logs')
@Index('ix_audit_logs_entity_entity_id', ['entity', 'entityId', 'createdAt'])
@Index('ix_audit_logs_actor_user_id', ['actorUserId'])
@Check('ck_audit_logs_diff_object', `jsonb_typeof("diff") = 'object'`)
export class AuditLogTypeormEntity implements AuditLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  entity: AuditEntityEnum;

  @Column({ name: 'entity_id', type: 'int' })
  entityId: number;

  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId: number | null;

  @ManyToOne(() => UserTypeormEntity, { nullable: true })
  @JoinColumn({ name: 'actor_user_id', foreignKeyConstraintName: 'audit_logs_actor_user_id_fkey' })
  actor: UserTypeormEntity | null;

  @Column({ name: 'change_type', type: 'varchar', length: 20 })
  changeType: AuditChangeTypeEnum;

  @Column({ type: 'jsonb' })
  diff: AuditDiff;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

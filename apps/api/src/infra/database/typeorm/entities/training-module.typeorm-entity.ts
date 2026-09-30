import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrainingModuleEntity } from '@Domain/materials/training-module.entity';

@Entity('training_modules')
@Check('ck_training_modules_duration_minutes', '"duration_minutes" > 0')
@Check('ck_training_modules_position', '"position" > 0')
export class TrainingModuleTypeormEntity implements TrainingModuleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ name: 'video_url', type: 'varchar', length: 2048 })
  videoUrl: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

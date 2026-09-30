import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TrainingModuleCompletionEntity } from '@Domain/materials/training-module.entity';
import { AffiliateTypeormEntity } from './affiliate.typeorm-entity';
import { TrainingModuleTypeormEntity } from './training-module.typeorm-entity';

@Entity('training_module_completions')
export class TrainingModuleCompletionTypeormEntity implements TrainingModuleCompletionEntity {
  @PrimaryColumn({ name: 'affiliate_id', type: 'int' })
  affiliateId: number;

  @PrimaryColumn({ name: 'training_module_id', type: 'int' })
  trainingModuleId: number;

  @ManyToOne(() => AffiliateTypeormEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'affiliate_id',
    foreignKeyConstraintName: 'training_module_completions_affiliate_id_fkey',
  })
  affiliate: AffiliateTypeormEntity;

  @ManyToOne(() => TrainingModuleTypeormEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'training_module_id',
    foreignKeyConstraintName: 'training_module_completions_training_module_id_fkey',
  })
  trainingModule: TrainingModuleTypeormEntity;

  @Column({ name: 'completed_at', type: 'timestamptz' })
  completedAt: Date;
}

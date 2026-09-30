import { createToken } from '@Domain/shared/token';
import { TrainingModuleEntity, TrainingModuleInput } from './training-module.entity';

export const TRAINING_MODULE_REPOSITORY = createToken<TrainingModuleRepository>(
  'TRAINING_MODULE_REPOSITORY',
);

export interface TrainingModuleRepository {
  /** A trilha inteira, na ordem em que o afiliado a percorre. */
  list(): Promise<TrainingModuleEntity[]>;
  findByPublicId(publicId: string): Promise<TrainingModuleEntity | null>;
  create(input: TrainingModuleInput): Promise<TrainingModuleEntity>;
  /** Nulo quando o módulo não existe. */
  update(publicId: string, input: TrainingModuleInput): Promise<TrainingModuleEntity | null>;
  /** Leva junto o progresso de quem já o assistiu. Falso quando o módulo não existe. */
  delete(publicId: string): Promise<boolean>;
  /** Os ids dos módulos que o afiliado marcou como assistidos. */
  listCompletedIds(affiliateId: number): Promise<number[]>;
  /** Idempotente: marcar de novo não muda nada, nem a data da primeira vez. */
  markCompleted(affiliateId: number, trainingModuleId: number, completedAt: Date): Promise<void>;
}

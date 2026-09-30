import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { UseCase } from '../use-case';

/** Um módulo da trilha como o painel o edita. Criar e alterar devolvem a mesma forma. */
export interface TrainingModuleOutput {
  publicId: string;
  title: string;
  description: string;
  videoUrl: string;
  durationMinutes: number;
  position: number;
}

/** A trilha como o painel a edita, na ordem em que o afiliado a percorre. */
export class ListTrainingModulesUseCase implements UseCase<void, TrainingModuleOutput[]> {
  constructor(private readonly trainingModuleRepository: TrainingModuleRepository) {}

  async execute(): Promise<TrainingModuleOutput[]> {
    const modules = await this.trainingModuleRepository.list();

    return modules.map((module) => ({
      publicId: module.publicId,
      title: module.title,
      description: module.description,
      videoUrl: module.videoUrl,
      durationMinutes: module.durationMinutes,
      position: module.position,
    }));
  }
}

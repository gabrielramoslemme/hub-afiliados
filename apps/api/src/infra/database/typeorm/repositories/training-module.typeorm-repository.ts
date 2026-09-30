import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  TrainingModuleEntity,
  TrainingModuleInput,
} from '@Domain/materials/training-module.entity';
import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';
import { TrainingModuleTypeormEntity } from '@Infra/database/typeorm/entities/training-module.typeorm-entity';
import { TrainingModuleCompletionTypeormEntity } from '@Infra/database/typeorm/entities/training-module-completion.typeorm-entity';
import { nextPosition, reorderByPublicId } from './reorder-by-public-id';

@Injectable()
export class TrainingModuleTypeormRepository implements TrainingModuleRepository {
  constructor(
    @InjectRepository(TrainingModuleTypeormEntity)
    private readonly repository: Repository<TrainingModuleTypeormEntity>,
    @InjectRepository(TrainingModuleCompletionTypeormEntity)
    private readonly completionRepository: Repository<TrainingModuleCompletionTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  list(): Promise<TrainingModuleEntity[]> {
    // `id` desempata a mesma posição pela ordem de criação.
    return this.repository.find({ order: { position: 'ASC', id: 'ASC' } });
  }

  findByPublicId(publicId: string): Promise<TrainingModuleEntity | null> {
    return this.repository.findOne({ where: { publicId } });
  }

  create(input: TrainingModuleInput): Promise<TrainingModuleEntity> {
    return this.dataSource.transaction(async (manager) => {
      const position = await nextPosition(manager, TrainingModuleTypeormEntity);
      return manager.save(manager.create(TrainingModuleTypeormEntity, { ...input, position }));
    });
  }

  reorder(publicIds: string[]): Promise<boolean> {
    return this.dataSource.transaction((manager) =>
      reorderByPublicId(manager, TrainingModuleTypeormEntity, publicIds),
    );
  }

  async update(publicId: string, input: TrainingModuleInput): Promise<TrainingModuleEntity | null> {
    const module = await this.repository.findOne({ where: { publicId } });
    if (!module) return null;

    return this.repository.save(this.repository.merge(module, input));
  }

  async delete(publicId: string): Promise<boolean> {
    const result = await this.repository.delete({ publicId });

    return Boolean(result.affected);
  }

  async listCompletedIds(affiliateId: number): Promise<number[]> {
    const completions = await this.completionRepository.find({
      select: { trainingModuleId: true },
      where: { affiliateId },
    });

    return completions.map((completion) => completion.trainingModuleId);
  }

  async markCompleted(
    affiliateId: number,
    trainingModuleId: number,
    completedAt: Date,
  ): Promise<void> {
    // `ON CONFLICT DO NOTHING`: a chave é o par, e a data que fica é a da primeira vez.
    await this.completionRepository
      .createQueryBuilder()
      .insert()
      .values({ affiliateId, trainingModuleId, completedAt })
      .orIgnore()
      .execute();
  }

  async unmarkCompleted(affiliateId: number, trainingModuleId: number): Promise<void> {
    await this.completionRepository.delete({ affiliateId, trainingModuleId });
  }
}

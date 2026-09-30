import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PromotionalMaterialEntity,
  PromotionalMaterialInput,
} from '@Domain/materials/promotional-material.entity';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { PromotionalMaterialTypeormEntity } from '@Infra/database/typeorm/entities/promotional-material.typeorm-entity';
import { nextPosition, reorderByPublicId } from './reorder-by-public-id';

@Injectable()
export class PromotionalMaterialTypeormRepository implements PromotionalMaterialRepository {
  constructor(
    @InjectRepository(PromotionalMaterialTypeormEntity)
    private readonly repository: Repository<PromotionalMaterialTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  list(): Promise<PromotionalMaterialEntity[]> {
    return this.repository.find({ order: { position: 'ASC', id: 'ASC' } });
  }

  create(input: PromotionalMaterialInput): Promise<PromotionalMaterialEntity> {
    return this.dataSource.transaction(async (manager) => {
      const position = await nextPosition(manager, PromotionalMaterialTypeormEntity);
      return manager.save(manager.create(PromotionalMaterialTypeormEntity, { ...input, position }));
    });
  }

  reorder(publicIds: string[]): Promise<boolean> {
    return this.dataSource.transaction((manager) =>
      reorderByPublicId(manager, PromotionalMaterialTypeormEntity, publicIds),
    );
  }

  async update(
    publicId: string,
    input: PromotionalMaterialInput,
  ): Promise<PromotionalMaterialEntity | null> {
    const material = await this.repository.findOne({ where: { publicId } });
    if (!material) return null;

    return this.repository.save(this.repository.merge(material, input));
  }

  async delete(publicId: string): Promise<boolean> {
    const result = await this.repository.delete({ publicId });

    return Boolean(result.affected);
  }
}

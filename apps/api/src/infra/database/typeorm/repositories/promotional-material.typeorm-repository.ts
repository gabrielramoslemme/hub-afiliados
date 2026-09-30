import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PromotionalMaterialEntity,
  PromotionalMaterialInput,
} from '@Domain/materials/promotional-material.entity';
import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';
import { PromotionalMaterialTypeormEntity } from '@Infra/database/typeorm/entities/promotional-material.typeorm-entity';

@Injectable()
export class PromotionalMaterialTypeormRepository implements PromotionalMaterialRepository {
  constructor(
    @InjectRepository(PromotionalMaterialTypeormEntity)
    private readonly repository: Repository<PromotionalMaterialTypeormEntity>,
  ) {}

  list(): Promise<PromotionalMaterialEntity[]> {
    return this.repository.find({ order: { position: 'ASC', id: 'ASC' } });
  }

  create(input: PromotionalMaterialInput): Promise<PromotionalMaterialEntity> {
    return this.repository.save(this.repository.create(input));
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

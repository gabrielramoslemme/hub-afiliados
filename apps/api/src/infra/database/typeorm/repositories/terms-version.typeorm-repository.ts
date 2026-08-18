import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermsVersionEntity } from '@Domain/terms/terms-version.entity';
import { TermsVersionRepository } from '@Domain/terms/terms-version.repository';
import { TermsVersionTypeormEntity } from '@Infra/database/typeorm/entities/terms-version.typeorm-entity';

@Injectable()
export class TermsVersionTypeormRepository implements TermsVersionRepository {
  constructor(
    @InjectRepository(TermsVersionTypeormEntity)
    private readonly repository: Repository<TermsVersionTypeormEntity>,
  ) {}

  findCurrent(): Promise<TermsVersionEntity | null> {
    return this.repository.findOne({ where: { isCurrent: true } });
  }

  findById(id: number): Promise<TermsVersionEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
}

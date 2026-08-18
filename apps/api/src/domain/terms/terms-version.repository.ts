import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermsVersionEntity } from '@Infra/database/typeorm/entities/terms-version.entity';

@Injectable()
export class TermsVersionRepository {
  constructor(
    @InjectRepository(TermsVersionEntity)
    private readonly repository: Repository<TermsVersionEntity>,
  ) {}

  findCurrent(): Promise<TermsVersionEntity | null> {
    return this.repository.findOne({ where: { isCurrent: true } });
  }

  findById(id: number): Promise<TermsVersionEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
}

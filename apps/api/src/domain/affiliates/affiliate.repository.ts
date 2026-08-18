import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AffiliateEntity } from '@Infra/database/typeorm/entities/affiliate.entity';

@Injectable()
export class AffiliateRepository {
  constructor(
    @InjectRepository(AffiliateEntity)
    private readonly repository: Repository<AffiliateEntity>,
  ) {}

  findByCpf(cpf: string): Promise<AffiliateEntity | null> {
    return this.repository.findOne({ where: { cpf } });
  }

  findByPublicId(publicId: string): Promise<AffiliateEntity | null> {
    return this.repository.findOne({
      where: { publicId },
      relations: { user: true, termsVersion: true, approvedBy: true },
    });
  }

  findByUserId(userId: number): Promise<AffiliateEntity | null> {
    return this.repository.findOne({ where: { userId }, relations: { user: true } });
  }

  save(affiliate: Partial<AffiliateEntity>): Promise<AffiliateEntity> {
    return this.repository.save(this.repository.create(affiliate));
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserWithAffiliate } from '@Domain/users/user.entity';
import { UserRepository } from '@Domain/users/user.repository';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';

@Injectable()
export class UserTypeormRepository implements UserRepository {
  constructor(
    @InjectRepository(UserTypeormEntity)
    private readonly repository: Repository<UserTypeormEntity>,
  ) {}

  findByEmail(email: string): Promise<UserWithAffiliate | null> {
    return this.repository.findOne({ where: { email }, relations: { affiliate: true } });
  }

  findByPublicId(publicId: string): Promise<UserWithAffiliate | null> {
    return this.repository.findOne({ where: { publicId }, relations: { affiliate: true } });
  }

  findById(id: number): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  save(user: Partial<UserEntity>): Promise<UserEntity> {
    return this.repository.save(this.repository.create(user));
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@Infra/database/typeorm/entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email }, relations: { affiliate: true } });
  }

  findByPublicId(publicId: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { publicId }, relations: { affiliate: true } });
  }

  findById(id: number): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  save(user: Partial<UserEntity>): Promise<UserEntity> {
    return this.repository.save(this.repository.create(user));
  }
}

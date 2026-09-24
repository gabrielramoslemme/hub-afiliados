import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailAlreadyRegisteredError } from '@Domain/affiliates/affiliates.errors';
import { UserEntity, UserWithAffiliate } from '@Domain/users/user.entity';
import { UserRepository } from '@Domain/users/user.repository';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class UserTypeormRepository implements UserRepository {
  constructor(
    @InjectRepository(UserTypeormEntity)
    private readonly repository: Repository<UserTypeormEntity>,
  ) {}

  /*
    O cupom vem no mesmo `findOne` porque o tipo promete que ele está lá: o
    login e a área do afiliado mostram o código, e carregar só o perfil devolve
    `undefined` em produção sem o compilador reclamar.
  */
  findByEmail(email: string): Promise<UserWithAffiliate | null> {
    return this.repository.findOne({
      where: { email },
      relations: { affiliate: { coupon: true } },
    });
  }

  findByPublicId(publicId: string): Promise<UserWithAffiliate | null> {
    return this.repository.findOne({
      where: { publicId },
      relations: { affiliate: { coupon: true } },
    });
  }

  findById(id: number): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  /*
    A troca de e-mail confere antes se o endereço está livre, mas é o índice
    único que decide quando duas contas pedem o mesmo ao mesmo tempo — ou quando
    ele é de uma conta apagada, que o `findOne` não enxerga. Sem a tradução, 500.
  */
  async save(user: Partial<UserEntity>): Promise<UserEntity> {
    try {
      return await this.repository.save(this.repository.create(user));
    } catch (error) {
      const violation = error as { code?: string; constraint?: string };
      if (violation.code === UNIQUE_VIOLATION && violation.constraint === 'users_email_key') {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }
}

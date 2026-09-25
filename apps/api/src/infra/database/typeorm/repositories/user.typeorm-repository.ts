import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EmailAlreadyRegisteredError } from '@Domain/affiliates/affiliates.errors';
import { UserEntity, UserWithAffiliate } from '@Domain/users/user.entity';
import { UpdateUserWithAuditInput, UserRepository } from '@Domain/users/user.repository';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';
import { recordAuditLog } from './record-audit-log';

const UNIQUE_VIOLATION = '23505';

/*
  A troca de e-mail confere antes se o endereço está livre, mas é o índice
  único que decide quando duas contas pedem o mesmo ao mesmo tempo — ou quando
  ele é de uma conta apagada, que o `findOne` não enxerga. Sem a tradução, 500.
*/
function translateEmailViolation(error: unknown): unknown {
  const violation = error as { code?: string; constraint?: string };
  if (violation.code === UNIQUE_VIOLATION && violation.constraint === 'users_email_key') {
    return new EmailAlreadyRegisteredError();
  }
  return error;
}

@Injectable()
export class UserTypeormRepository implements UserRepository {
  constructor(
    @InjectRepository(UserTypeormEntity)
    private readonly repository: Repository<UserTypeormEntity>,
    private readonly dataSource: DataSource,
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

  async save(user: Partial<UserEntity>): Promise<UserEntity> {
    try {
      return await this.repository.save(this.repository.create(user));
    } catch (error) {
      throw translateEmailViolation(error);
    }
  }

  async updateWithAudit(input: UpdateUserWithAuditInput): Promise<UserEntity | null> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // O lock garante que o "antes" gravado na trilha é o que valia quando a
        // edição entrou, e não o de uma leitura que outra escrita já envelheceu.
        const user = await manager.findOne(UserTypeormEntity, {
          where: { id: input.userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!user) return null;

        const before = { ...user };
        Object.assign(user, input.changes);
        const updated = await manager.save(user);

        await recordAuditLog(manager, input.audit, before, input.changes);

        return updated;
      });
    } catch (error) {
      throw translateEmailViolation(error);
    }
  }
}

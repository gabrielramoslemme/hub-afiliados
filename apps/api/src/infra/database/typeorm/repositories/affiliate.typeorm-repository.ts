import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AffiliateStatusEnum, UserTypeEnum } from '@porto/contracts';
import {
  AffiliateDetail,
  AffiliateEntity,
  AffiliateWithUser,
} from '@Domain/affiliates/affiliate.entity';
import {
  AffiliateRepository,
  AffiliateSortBy,
  ChangeAffiliateStatusInput,
  CreateAffiliateWithUserInput,
  SearchAffiliatesInput,
  SearchAffiliatesResult,
} from '@Domain/affiliates/affiliate.repository';
import {
  CpfAlreadyRegisteredError,
  EmailAlreadyRegisteredError,
} from '@Domain/affiliates/affiliates.errors';
import { sanitizeCpf } from '@Domain/affiliates/cpf.util';
import { AffiliateTypeormEntity } from '@Infra/database/typeorm/entities/affiliate.typeorm-entity';
import { AffiliateStatusHistoryTypeormEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.typeorm-entity';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';

const UNIQUE_VIOLATION = '23505';

/**
 * O contrato só admite estes dois. É caminho de propriedade, não nome de coluna:
 * com `skip`/`take` o TypeORM monta uma subconsulta de ids e resolve o `ORDER BY`
 * pelo metadado — nome de coluna cru quebra ali, em runtime.
 */
const SORT_COLUMNS: Record<AffiliateSortBy, string> = {
  createdAt: 'affiliate.createdAt',
  name: 'user.name',
};

const DIGITS_AND_PUNCTUATION = /^[\d.\s-]+$/;

/**
 * A busca decide pelo conteúdo: entrada só de dígitos e pontuação procura CPF,
 * o resto procura pessoa. É a mesma regra que a analista já usa no painel.
 */
function criteriaFor(search: string): [string, Record<string, string>] {
  const digits = sanitizeCpf(search);

  if (digits.length > 0 && DIGITS_AND_PUNCTUATION.test(search)) {
    return ['affiliate.cpf LIKE :cpf', { cpf: `${digits}%` }];
  }

  return ['(user.name ILIKE :term OR user.email ILIKE :term)', { term: `%${search}%` }];
}

/**
 * A checagem prévia do use case dá a mensagem boa no caso comum; o índice único
 * é o que decide quando dois cadastros chegam juntos. Sem esta tradução a
 * corrida vira 500.
 */
function translateUniqueViolation(error: unknown): unknown {
  const constraint = error as { code?: string; constraint?: string };
  if (constraint.code !== UNIQUE_VIOLATION) return error;
  if (constraint.constraint === 'users_email_key') return new EmailAlreadyRegisteredError();
  if (constraint.constraint === 'affiliates_cpf_key') return new CpfAlreadyRegisteredError();
  return error;
}

@Injectable()
export class AffiliateTypeormRepository implements AffiliateRepository {
  constructor(
    @InjectRepository(AffiliateTypeormEntity)
    private readonly repository: Repository<AffiliateTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  findByCpf(cpf: string): Promise<AffiliateEntity | null> {
    return this.repository.findOne({ where: { cpf } });
  }

  findByPublicId(publicId: string): Promise<AffiliateDetail | null> {
    return this.repository.findOne({
      where: { publicId },
      relations: { user: true, approvedBy: true },
    });
  }

  findByUserId(userId: number): Promise<AffiliateWithUser | null> {
    return this.repository.findOne({ where: { userId }, relations: { user: true } });
  }

  async search(input: SearchAffiliatesInput): Promise<SearchAffiliatesResult> {
    const query = this.repository
      .createQueryBuilder('affiliate')
      // A lista mostra nome e e-mail; resolvê-los depois seria N+1 numa tela
      // paginada de dez em dez.
      .innerJoinAndSelect('affiliate.user', 'user');

    if (input.status) query.andWhere('affiliate.status = :status', { status: input.status });

    if (input.search) query.andWhere(...criteriaFor(input.search));

    const [rows, total] = await query
      .orderBy(SORT_COLUMNS[input.sortBy], input.sortOrder === 'asc' ? 'ASC' : 'DESC')
      // O `id` desempata cadastros gravados no mesmo instante: sem ele a
      // paginação repete uma linha numa página e some com ela na outra.
      .addOrderBy('affiliate.id', 'DESC')
      .skip((input.page - 1) * input.limit)
      .take(input.limit)
      .getManyAndCount();

    return { rows, total };
  }

  save(affiliate: Partial<AffiliateEntity>): Promise<AffiliateEntity> {
    return this.repository.save(this.repository.create(affiliate));
  }

  changeStatus(input: ChangeAffiliateStatusInput): Promise<AffiliateEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      // O lock serializa duas decisões concorrentes sobre o mesmo afiliado:
      // sem ele, dois analistas gravariam transições partindo do mesmo status.
      const affiliate = await manager.findOne(AffiliateTypeormEntity, {
        where: { id: input.affiliateId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!affiliate) {
        return null;
      }

      const fromStatus = affiliate.status;
      Object.assign(affiliate, { status: input.toStatus }, input.changes ?? {});
      const updated = await manager.save(affiliate);

      await manager.insert(AffiliateStatusHistoryTypeormEntity, {
        affiliateId: affiliate.id,
        fromStatus,
        toStatus: input.toStatus,
        reason: input.reason ?? null,
        actorUserId: input.actorUserId ?? null,
      });

      return updated;
    });
  }

  async createWithUser(input: CreateAffiliateWithUserInput): Promise<AffiliateWithUser> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.save(
          manager.create(UserTypeormEntity, {
            name: input.fullName,
            email: input.email,
            password: null,
            passwordSetAt: null,
            shouldChangePassword: false,
            isActive: true,
            type: UserTypeEnum.AFFILIATE,
            role: null,
          }),
        );

        const affiliate = await manager.save(
          manager.create(AffiliateTypeormEntity, {
            userId: user.id,
            cpf: input.cpf,
            pixKeyType: input.pixKeyType,
            pixKey: input.pixKey,
            status: AffiliateStatusEnum.PENDING_APPROVAL,
          }),
        );

        await manager.insert(AffiliateStatusHistoryTypeormEntity, {
          affiliateId: affiliate.id,
          fromStatus: null,
          toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
          reason: null,
          actorUserId: null,
        });

        return { ...affiliate, user };
      });
    } catch (error) {
      throw translateUniqueViolation(error);
    }
  }
}

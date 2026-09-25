import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AffiliateStatusEnum, AuditEntityEnum, UserTypeEnum } from '@porto/contracts';
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
  UpdateAffiliateWithAuditInput,
} from '@Domain/affiliates/affiliate.repository';
import {
  CpfAlreadyRegisteredError,
  EmailAlreadyRegisteredError,
  RgAlreadyRegisteredError,
} from '@Domain/affiliates/affiliates.errors';
import { sanitizeCpf } from '@Domain/affiliates/cpf.util';
import { CouponCodeUnavailableError } from '@Domain/coupons/coupons.errors';
import { AffiliateTypeormEntity } from '@Infra/database/typeorm/entities/affiliate.typeorm-entity';
import { AffiliateStatusHistoryTypeormEntity } from '@Infra/database/typeorm/entities/affiliate-status-history.typeorm-entity';
import { CouponTypeormEntity } from '@Infra/database/typeorm/entities/coupon.typeorm-entity';
import { CouponHistoryTypeormEntity } from '@Infra/database/typeorm/entities/coupon-history.typeorm-entity';
import { UserTypeormEntity } from '@Infra/database/typeorm/entities/user.typeorm-entity';
import { recordAuditLog } from './record-audit-log';

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
 * é o que decide quando dois cadastros chegam juntos, ou duas aprovações com o
 * mesmo código de cupom. Sem esta tradução a corrida vira 500.
 */
function translateUniqueViolation(error: unknown): unknown {
  const constraint = error as { code?: string; constraint?: string };
  if (constraint.code !== UNIQUE_VIOLATION) return error;
  if (constraint.constraint === 'users_email_key') return new EmailAlreadyRegisteredError();
  if (constraint.constraint === 'affiliates_cpf_key') return new CpfAlreadyRegisteredError();
  if (constraint.constraint === 'affiliates_rg_key') return new RgAlreadyRegisteredError();
  if (constraint.constraint === 'affiliate_coupons_code_key') {
    return new CouponCodeUnavailableError();
  }
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

  findByRg(rg: string): Promise<AffiliateEntity | null> {
    return this.repository.findOne({ where: { rg } });
  }

  findByPublicId(publicId: string): Promise<AffiliateDetail | null> {
    return this.repository.findOne({
      where: { publicId },
      relations: { user: true, approvedBy: true, coupon: true },
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

  updateWithAudit(input: UpdateAffiliateWithAuditInput): Promise<AffiliateEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      // O lock garante que o "antes" gravado na trilha é o que valia quando a
      // edição entrou, e não o de uma leitura que outra escrita já envelheceu.
      const affiliate = await manager.findOne(AffiliateTypeormEntity, {
        where: { id: input.affiliateId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!affiliate) return null;

      const before = { ...affiliate };
      Object.assign(affiliate, input.changes);
      const updated = await manager.save(affiliate);

      await recordAuditLog(
        manager,
        {
          entity: AuditEntityEnum.AFFILIATE,
          entityId: affiliate.id,
          actorUserId: input.actorUserId,
        },
        before,
        input.changes,
      );

      return updated;
    });
  }

  async changeStatus(input: ChangeAffiliateStatusInput): Promise<AffiliateEntity | null> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // O lock serializa duas decisões concorrentes sobre o mesmo afiliado:
        // sem ele, dois analistas gravariam transições partindo do mesmo status.
        const affiliate = await manager.findOne(AffiliateTypeormEntity, {
          where: { id: input.affiliateId },
          lock: { mode: 'pessimistic_write' },
        });

        // A guarda vale aqui dentro, com a linha travada: lida antes do lock, duas
        // decisões simultâneas veriam o mesmo status e gravariam as duas.
        if (!affiliate || affiliate.status !== input.expectedStatus) {
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

        /*
          O cupom entra na mesma transação do status e da trilha porque o código
          já existe na Porto quando chega aqui: gravar o status e perder a linha
          do cupom deixaria um afiliado aprovado sem o cupom que já foi emitido
          em nome dele, e sem como descobrir qual era.
        */
        if (input.coupon) {
          const inserted = await manager.insert(CouponTypeormEntity, {
            affiliateId: affiliate.id,
            code: input.coupon.code,
            discountPercent: input.coupon.discountPercent,
            status: input.coupon.status,
          });

          // A emissão é o primeiro registro da trilha do cupom, e sai com quem aprovou.
          await manager.insert(CouponHistoryTypeormEntity, {
            couponId: inserted.identifiers[0].id,
            fromStatus: null,
            toStatus: input.coupon.status,
            fromDiscountPercent: null,
            toDiscountPercent: input.coupon.discountPercent,
            actorUserId: input.actorUserId ?? null,
          });
        }

        return updated;
      });
    } catch (error) {
      throw translateUniqueViolation(error);
    }
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
            rg: input.rg,
            pixKeyType: input.pixKeyType,
            pixKey: input.pixKey,
            socialNetwork: input.socialNetwork,
            socialHandle: input.socialHandle,
            termsAcceptedAt: input.termsAcceptedAt,
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

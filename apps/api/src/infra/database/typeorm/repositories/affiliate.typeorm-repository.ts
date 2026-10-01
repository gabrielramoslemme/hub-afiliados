import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AffiliateStatusEnum,
  AuditChangeTypeEnum,
  AuditEntityEnum,
  IncentiveStatusEnum,
  UserRoleEnum,
  UserTypeEnum,
} from '@porto/contracts';
import {
  AffiliateDetail,
  AffiliateEntity,
  AffiliateWithUser,
} from '@Domain/affiliates/affiliate.entity';
import {
  AffiliateReportRecord,
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
import { CouponTypeormEntity } from '@Infra/database/typeorm/entities/coupon.typeorm-entity';
import { SaleTypeormEntity } from '@Infra/database/typeorm/entities/sale.typeorm-entity';
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

  return [
    "(user.name ILIKE :term ESCAPE '\\' OR user.email ILIKE :term ESCAPE '\\')",
    { term: `%${escapeLikePattern(search)}%` },
  ];
}

/**
 * O que a analista digita é texto: sem o escape, `%` listaria todo cadastro e
 * `_` casaria qualquer letra. A barra também ganha escape, porque é ela quem
 * escapa as outras duas — e o `ESCAPE` da consulta a declara, em vez de confiar
 * no padrão do Postgres.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
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

    if (input.occupation) {
      query.andWhere('affiliate.occupation = :occupation', { occupation: input.occupation });
    }

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

  async listForReport(): Promise<AffiliateReportRecord[]> {
    const affiliates = await this.repository.find({
      relations: { user: true, coupon: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    /*
      A soma sai do banco, agrupada por cupom, em vez de carregar venda por venda:
      a planilha lê a base inteira de uma vez. `bigint` porque a soma de muitos
      `int` em centavos passa do teto de 32 bits, e o driver o devolve como texto.
    */
    const totals: Array<{
      couponId: number;
      count: string;
      amountCents: string;
      incentiveCents: string;
    }> = await this.dataSource
      .getRepository(SaleTypeormEntity)
      .createQueryBuilder('sale')
      .select('sale.couponId', 'couponId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(sale.amountCents)', 'amountCents')
      .addSelect('SUM(sale.incentiveCents)', 'incentiveCents')
      .where('sale.incentiveStatus = :released', { released: IncentiveStatusEnum.RELEASED })
      .groupBy('sale.couponId')
      .getRawMany();

    const byCoupon = new Map(
      totals.map((row) => [
        row.couponId,
        {
          count: Number(row.count),
          amountCents: Number(row.amountCents),
          incentiveCents: Number(row.incentiveCents),
        },
      ]),
    );

    return affiliates.map((affiliate) => ({
      ...affiliate,
      completedSales: affiliate.coupon ? (byCoupon.get(affiliate.coupon.id) ?? null) : null,
    }));
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

        await recordAuditLog(
          manager,
          {
            entity: AuditEntityEnum.AFFILIATE,
            entityId: affiliate.id,
            actorUserId: input.actorUserId ?? null,
          },
          { status: fromStatus },
          { status: input.toStatus },
          { justification: input.reason ?? null },
        );

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
          await recordAuditLog(
            manager,
            {
              entity: AuditEntityEnum.COUPON,
              entityId: inserted.identifiers[0].id,
              actorUserId: input.actorUserId ?? null,
            },
            {},
            input.coupon,
            { changeType: AuditChangeTypeEnum.CREATE },
          );
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
            role: UserRoleEnum.AFFILIATE,
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
            occupation: input.occupation,
            termsAcceptedAt: input.termsAcceptedAt,
            status: AffiliateStatusEnum.PENDING_APPROVAL,
          }),
        );

        // Sem autor: o cadastro público não tem sessão.
        await recordAuditLog(
          manager,
          { entity: AuditEntityEnum.AFFILIATE, entityId: affiliate.id, actorUserId: null },
          {},
          { status: affiliate.status },
          { changeType: AuditChangeTypeEnum.CREATE },
        );

        return { ...affiliate, user };
      });
    } catch (error) {
      throw translateUniqueViolation(error);
    }
  }
}

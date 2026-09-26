import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThan,
  Not,
  Repository,
} from 'typeorm';
import {
  IncentiveStatusEnum,
  PayoutEventOutcomeEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import { redactSensitive } from '@Domain/shared/redaction.util';
import {
  PayoutTransitionEnum,
  RELEASING_STATUSES,
  resolvePayoutTransition,
} from '@Domain/withdrawals/payout-transition.util';
import { WithdrawalEntity, WithdrawalWithAffiliate } from '@Domain/withdrawals/withdrawal.entity';
import {
  ApplyPayoutUpdateInput,
  ApplyPayoutUpdateResult,
  ListStaleWithdrawalsInput,
  ReserveWithdrawalInput,
  SearchWithdrawalsInput,
  SearchWithdrawalsResult,
  WithdrawalRepository,
} from '@Domain/withdrawals/withdrawal.repository';
import { PayoutEventTypeormEntity } from '@Infra/database/typeorm/entities/payout-event.typeorm-entity';
import { SaleTypeormEntity } from '@Infra/database/typeorm/entities/sale.typeorm-entity';
import { WithdrawalTypeormEntity } from '@Infra/database/typeorm/entities/withdrawal.typeorm-entity';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OUTCOME_BY_TRANSITION: Record<PayoutTransitionEnum, PayoutEventOutcomeEnum> = {
  [PayoutTransitionEnum.APPLY]: PayoutEventOutcomeEnum.APPLIED,
  [PayoutTransitionEnum.DUPLICATE]: PayoutEventOutcomeEnum.DUPLICATE,
  [PayoutTransitionEnum.IGNORE]: PayoutEventOutcomeEnum.IGNORED,
  [PayoutTransitionEnum.DIVERGE]: PayoutEventOutcomeEnum.DIVERGENT,
};

/** A data que o desfecho grava. */
const STAMP_BY_STATUS: Partial<Record<WithdrawalStatusEnum, 'paidAt' | 'failedAt' | 'returnedAt'>> =
  {
    [WithdrawalStatusEnum.PAID]: 'paidAt',
    [WithdrawalStatusEnum.FAILED]: 'failedAt',
    [WithdrawalStatusEnum.RETURNED]: 'returnedAt',
  };

function toWithdrawalWithAffiliate(row: WithdrawalTypeormEntity): WithdrawalWithAffiliate {
  const { affiliate, ...withdrawal } = row;

  return {
    ...withdrawal,
    affiliate: {
      publicId: affiliate.publicId,
      name: affiliate.user.name,
      email: affiliate.user.email,
      cpf: affiliate.cpf,
    },
  };
}

function withoutRelations(row: WithdrawalTypeormEntity): WithdrawalEntity {
  const { affiliate: _affiliate, ...withdrawal } = row;

  return withdrawal;
}

@Injectable()
export class WithdrawalTypeormRepository implements WithdrawalRepository {
  constructor(
    @InjectRepository(WithdrawalTypeormEntity)
    private readonly repository: Repository<WithdrawalTypeormEntity>,
    private readonly dataSource: DataSource,
  ) {}

  reserve({
    affiliateId,
    couponId,
    pixKeyType,
    pixKey,
    requestedAt,
  }: ReserveWithdrawalInput): Promise<WithdrawalEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      /*
        O lock é o que impede dois pedidos simultâneos de somar as mesmas
        vendas: o segundo espera o primeiro, e o Postgres reavalia o
        `withdrawal_id IS NULL` nas linhas que ele gravou — o segundo encontra
        zero, em vez de pagar em dobro.
      */
      const sales = await manager.find(SaleTypeormEntity, {
        where: { couponId, incentiveStatus: IncentiveStatusEnum.RELEASED, withdrawalId: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });

      const amountCents = sales.reduce((total, sale) => total + sale.incentiveCents, 0);
      if (amountCents === 0) return null;

      const saved = await manager.save(
        manager.create(WithdrawalTypeormEntity, {
          affiliateId,
          amountCents,
          status: WithdrawalStatusEnum.REQUESTED,
          pixKeyType,
          pixKey,
          providerBatchId: null,
          providerTransferId: null,
          endToEndId: null,
          receiptUrl: null,
          failureReason: null,
          requestedAt,
          paidAt: null,
          failedAt: null,
          returnedAt: null,
        }),
      );

      await manager.update(
        SaleTypeormEntity,
        { id: In(sales.map((sale) => sale.id)) },
        { withdrawalId: saved.id },
      );

      return withoutRelations(
        await manager.findOneByOrFail(WithdrawalTypeormEntity, { id: saved.id }),
      );
    });
  }

  async markProcessing(reference: string, batchId: string | null): Promise<void> {
    // O webhook pode ter chegado antes desta linha — e levado o saque a pago.
    // Aqui só se avança quem ainda está `REQUESTED`, e o lote só entra onde faltava.
    await this.dataSource.query(
      `UPDATE "affiliate_withdrawals"
          SET "status" = CASE WHEN "status" = 'REQUESTED' THEN 'PROCESSING' ELSE "status" END,
              "provider_batch_id" = COALESCE("provider_batch_id", $2),
              "updated_at" = now()
        WHERE "public_id" = $1`,
      [reference, batchId],
    );
  }

  applyPayoutUpdate({
    update,
    at,
    event,
  }: ApplyPayoutUpdateInput): Promise<ApplyPayoutUpdateResult> {
    return this.dataSource.transaction(async (manager) => {
      // Referência que não é uuid não é nossa: consultar com ela faria o
      // Postgres lançar, e a chamada viraria 500 em vez de 404.
      const withdrawal = UUID.test(update.reference)
        ? await manager.findOne(WithdrawalTypeormEntity, {
            where: { publicId: update.reference },
            lock: { mode: 'pessimistic_write' },
          })
        : null;

      const outcome = withdrawal
        ? OUTCOME_BY_TRANSITION[resolvePayoutTransition(withdrawal.status, update.status)]
        : PayoutEventOutcomeEnum.UNKNOWN_WITHDRAWAL;

      if (withdrawal && update.status && outcome === PayoutEventOutcomeEnum.APPLIED) {
        const stamp = STAMP_BY_STATUS[update.status];
        const releases = RELEASING_STATUSES.includes(update.status);

        await manager.update(
          WithdrawalTypeormEntity,
          { id: withdrawal.id },
          {
            status: update.status,
            ...(stamp ? { [stamp]: at } : {}),
            providerTransferId: update.providerTransferId ?? withdrawal.providerTransferId,
            endToEndId: update.endToEndId ?? withdrawal.endToEndId,
            receiptUrl: update.receiptUrl ?? withdrawal.receiptUrl,
            // O motivo aparece no painel e vem do texto livre do fornecedor,
            // que pode citar a chave deste saque.
            failureReason: releases
              ? update.failureReason && redactSensitive(update.failureReason, [withdrawal.pixKey])
              : withdrawal.failureReason,
          },
        );

        if (releases) {
          await manager.update(
            SaleTypeormEntity,
            { withdrawalId: withdrawal.id },
            { withdrawalId: null },
          );
        }
      }

      if (event) {
        // `save`, e não `insert`: o tipo do `insert` trata o objeto da coluna
        // `jsonb` como entidade aninhada e recusa o `payload` (mesma armadilha
        // do `record-audit-log.ts`).
        await manager.save(
          manager.create(PayoutEventTypeormEntity, {
            source: event.source,
            eventId: event.eventId,
            withdrawalId: withdrawal?.id ?? null,
            reference: update.reference || null,
            providerStatus: update.providerStatus || null,
            outcome,
            payload: update.payload,
            receivedAt: event.receivedAt,
          }),
        );
      }

      return {
        outcome,
        withdrawal: withdrawal ? await this.loadWithAffiliate(manager, withdrawal.id) : null,
      };
    });
  }

  async listByAffiliate(affiliateId: number): Promise<WithdrawalEntity[]> {
    const rows = await this.repository.find({
      where: { affiliateId },
      order: { requestedAt: 'DESC', id: 'DESC' },
    });

    return rows.map(withoutRelations);
  }

  async listStale({
    status,
    updatedBefore,
    limit,
  }: ListStaleWithdrawalsInput): Promise<WithdrawalWithAffiliate[]> {
    const rows = await this.repository.find({
      where: {
        status,
        updatedAt: LessThan(updatedBefore),
        // Sem lote não há o que consultar: o saque espera o webhook.
        ...(status === WithdrawalStatusEnum.PROCESSING ? { providerBatchId: Not(IsNull()) } : {}),
      },
      relations: { affiliate: { user: true } },
      order: { updatedAt: 'ASC', id: 'ASC' },
      take: limit,
    });

    return rows.map(toWithdrawalWithAffiliate);
  }

  async search({
    page,
    limit,
    status,
    search,
    requestedFrom,
    requestedUntil,
  }: SearchWithdrawalsInput): Promise<SearchWithdrawalsResult> {
    const query = this.repository
      .createQueryBuilder('withdrawal')
      .innerJoinAndSelect('withdrawal.affiliate', 'affiliate')
      .innerJoinAndSelect('affiliate.user', 'user')
      .orderBy('withdrawal.requestedAt', 'DESC')
      .addOrderBy('withdrawal.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) query.andWhere('withdrawal.status = :status', { status });
    if (requestedFrom)
      query.andWhere('withdrawal.requestedAt >= :requestedFrom', { requestedFrom });
    if (requestedUntil) {
      query.andWhere('withdrawal.requestedAt < :requestedUntil', { requestedUntil });
    }
    if (search) {
      const digits = search.replace(/\D/g, '');
      query.andWhere(
        new Brackets((where) => {
          where.where('user.name ILIKE :name', { name: `%${search}%` });
          // O CPF é guardado só em dígitos; digitado com pontuação ou sem, o que conta são os 11.
          if (digits.length === 11) where.orWhere('affiliate.cpf = :cpf', { cpf: digits });
        }),
      );
    }

    const [rows, total] = await query.getManyAndCount();

    return { data: rows.map(toWithdrawalWithAffiliate), total, page, limit };
  }

  async findByPublicId(publicId: string): Promise<WithdrawalWithAffiliate | null> {
    if (!UUID.test(publicId)) return null;

    const row = await this.repository.findOne({
      where: { publicId },
      relations: { affiliate: { user: true } },
    });

    return row ? toWithdrawalWithAffiliate(row) : null;
  }

  private async loadWithAffiliate(
    manager: EntityManager,
    id: number,
  ): Promise<WithdrawalWithAffiliate> {
    const row = await manager.findOneOrFail(WithdrawalTypeormEntity, {
      where: { id },
      relations: { affiliate: { user: true } },
    });

    return toWithdrawalWithAffiliate(row);
  }
}

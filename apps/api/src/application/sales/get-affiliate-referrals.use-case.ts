import { IncentiveStatusEnum, ReferralPeriodEnum, ReferralStatusEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { SaleEntity } from '@Domain/sales/sale.entity';
import { SaleRepository } from '@Domain/sales/sale.repository';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface GetAffiliateReferralsInput {
  userPublicId: string;
  period: ReferralPeriodEnum;
}

export interface AffiliateReferralOutput {
  publicId: string;
  status: ReferralStatusEnum;
  service: string;
  saleCents: number;
  incentiveCents: number;
  occurredAt: Date;
}

export interface AffiliateReferralsSummaryOutput {
  salesCents: number;
  salesCount: number;
  confirmedIncentiveCents: number;
  pendingIncentiveCents: number;
  couponUses: number;
}

export interface AffiliateReferralsOutput {
  summary: AffiliateReferralsSummaryOutput;
  updatedAt: Date;
  entries: AffiliateReferralOutput[];
}

/** O afiliado vê o serviço concluído, não o incentivo liberado: é a mesma venda. */
const REFERRAL_STATUS: Record<IncentiveStatusEnum, ReferralStatusEnum> = {
  [IncentiveStatusEnum.PENDING]: ReferralStatusEnum.PENDING,
  [IncentiveStatusEnum.RELEASED]: ReferralStatusEnum.COMPLETED,
  [IncentiveStatusEnum.CANCELED]: ReferralStatusEnum.CANCELED,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Brasília não tem horário de verão desde 2019: o deslocamento é fixo. */
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Onde cada período começa. O ano vira à meia-noite de São Paulo, não à de
 * Greenwich: uma venda da noite de 31 de dezembro é do ano que terminou.
 */
function periodStart(period: ReferralPeriodEnum, now: Date): number {
  switch (period) {
    case ReferralPeriodEnum.LAST_30_DAYS:
      return now.getTime() - 30 * DAY_MS;
    case ReferralPeriodEnum.YEAR: {
      const year = new Date(now.getTime() - SAO_PAULO_OFFSET_MS).getUTCFullYear();
      return Date.UTC(year, 0, 1) + SAO_PAULO_OFFSET_MS;
    }
    case ReferralPeriodEnum.ALL:
      return Number.NEGATIVE_INFINITY;
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function summarize(sales: SaleEntity[]): AffiliateReferralsSummaryOutput {
  const released = sales.filter((sale) => sale.incentiveStatus === IncentiveStatusEnum.RELEASED);
  const pending = sales.filter((sale) => sale.incentiveStatus === IncentiveStatusEnum.PENDING);

  return {
    salesCents: sum(released.map((sale) => sale.amountCents)),
    salesCount: released.length,
    confirmedIncentiveCents: sum(released.map((sale) => sale.incentiveCents)),
    pendingIncentiveCents: sum(pending.map((sale) => sale.incentiveCents)),
    // Usar o cupom é comprar com ele, tenha o serviço acontecido ou não.
    couponUses: sales.length,
  };
}

/**
 * As vendas feitas com o cupom do afiliado, para a tela inicial. Só a lista
 * obedece o período: o resumo é o acumulado da conta, para o número do topo não
 * mudar de sentido conforme a aba escolhida.
 */
export class GetAffiliateReferralsUseCase
  implements UseCase<GetAffiliateReferralsInput, AffiliateReferralsOutput>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly saleRepository: SaleRepository,
    private readonly clock: Clock,
  ) {}

  async execute({
    userPublicId,
    period,
  }: GetAffiliateReferralsInput): Promise<AffiliateReferralsOutput> {
    const user = await this.userRepository.findByPublicId(userPublicId);
    if (!user?.affiliate) throw new UnknownAffiliateError();

    const now = this.clock.now();
    const { coupon } = user.affiliate;
    // Sem cupom não há venda: o afiliado ainda não foi aprovado.
    const sales = coupon ? await this.saleRepository.listByCoupon(coupon.id) : [];
    const since = periodStart(period, now);

    return {
      summary: summarize(sales),
      updatedAt: now,
      entries: sales
        .filter((sale) => sale.soldAt.getTime() >= since)
        .map((sale) => ({
          publicId: sale.publicId,
          status: REFERRAL_STATUS[sale.incentiveStatus],
          service: sale.item,
          saleCents: sale.amountCents,
          incentiveCents: sale.incentiveCents,
          occurredAt: sale.soldAt,
        })),
    };
  }
}

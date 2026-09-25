import { IncentiveStatusEnum, StatementEntryKindEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { SaleRepository } from '@Domain/sales/sale.repository';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface AffiliateStatementEntryOutput {
  publicId: string;
  kind: StatementEntryKindEnum;
  title: string;
  cents: number;
  occurredAt: Date;
}

export interface AffiliateWalletOutput {
  releasedCents: number;
  updatedAt: Date;
  entries: AffiliateStatementEntryOutput[];
}

/**
 * A carteira do afiliado: os incentivos liberados, que são o que a Porto vai
 * pagar. Sem saldo nem pagamentos — eles ainda não chegam à Mesa, e um saldo
 * que ignora o que já foi pago mentiria no primeiro pagamento.
 */
export class GetAffiliateWalletUseCase implements UseCase<string, AffiliateWalletOutput> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly saleRepository: SaleRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userPublicId: string): Promise<AffiliateWalletOutput> {
    const user = await this.userRepository.findByPublicId(userPublicId);
    if (!user?.affiliate) throw new UnknownAffiliateError();

    const { coupon } = user.affiliate;
    const sales = coupon ? await this.saleRepository.listByCoupon(coupon.id) : [];

    // O incentivo entra no extrato quando é liberado, não quando a venda é feita.
    const entries = sales
      .filter((sale) => sale.incentiveStatus === IncentiveStatusEnum.RELEASED && sale.settledAt)
      .map((sale) => ({
        publicId: sale.publicId,
        kind: StatementEntryKindEnum.INCENTIVE,
        title: sale.item,
        cents: sale.incentiveCents,
        occurredAt: sale.settledAt as Date,
      }))
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    return {
      releasedCents: entries.reduce((total, entry) => total + entry.cents, 0),
      updatedAt: this.clock.now(),
      entries,
    };
  }
}

import {
  AffiliateStatusEnum,
  CouponSummary,
  OccupationEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { UseCase } from '../use-case';

export interface AffiliateReportRowOutput {
  name: string;
  email: string;
  cpf: string;
  rg: string;
  occupation: OccupationEnum;
  socialNetwork: SocialNetworkEnum | null;
  socialHandle: string | null;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  status: AffiliateStatusEnum;
  createdAt: Date;
  approvedAt: Date | null;
  coupon: CouponSummary | null;
  completedSalesCount: number;
  completedSalesCents: number;
  releasedIncentiveCents: number;
  paidCommissionCents: number | null;
}

/**
 * A planilha de afiliados do painel. Sai com CPF, RG e chave PIX completos:
 * é a ferramenta de conferência da Porto, e a rota só abre para o painel.
 */
export class ListAffiliatesReportUseCase implements UseCase<void, AffiliateReportRowOutput[]> {
  constructor(private readonly affiliateRepository: AffiliateRepository) {}

  async execute(): Promise<AffiliateReportRowOutput[]> {
    const records = await this.affiliateRepository.listForReport();

    return records.map((affiliate) => ({
      name: affiliate.user.name,
      email: affiliate.user.email,
      cpf: affiliate.cpf,
      rg: affiliate.rg,
      occupation: affiliate.occupation,
      socialNetwork: affiliate.socialNetwork,
      socialHandle: affiliate.socialHandle,
      pixKeyType: affiliate.pixKeyType,
      pixKey: affiliate.pixKey,
      status: affiliate.status,
      createdAt: affiliate.createdAt,
      approvedAt: affiliate.approvedAt,
      coupon: affiliate.coupon
        ? {
            code: affiliate.coupon.code,
            discountPercent: affiliate.coupon.discountPercent,
            status: affiliate.coupon.status,
          }
        : null,
      // Sem venda concluída é zero vendido, não um dado que falta.
      completedSalesCount: affiliate.completedSales?.count ?? 0,
      completedSalesCents: affiliate.completedSales?.amountCents ?? 0,
      releasedIncentiveCents: affiliate.completedSales?.incentiveCents ?? 0,
      // A Porto não informa o que pagou; enquanto não informar, não há número.
      paidCommissionCents: null,
    }));
  }
}

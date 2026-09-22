import type { ReferralPeriodEnum } from '@porto/contracts';
import { fetchAccount, fetchReferrals, fetchWallet } from '../data';
import { firstNameOf } from './account-topbar';
import { CouponPanel } from './coupon-panel';
import { PageHeading } from './page-heading';
import { ReferralList } from './referral-list';
import { SummaryCards } from './summary-cards';

/** A primeira tela depois do login: o resumo, as indicações e o cupom. */
export async function HomeScreen({ period }: { period: ReferralPeriodEnum }) {
  const [account, wallet, referrals] = await Promise.all([
    fetchAccount(),
    fetchWallet(),
    fetchReferrals(period),
  ]);

  return (
    <>
      <PageHeading
        title={`Boas-vindas, ${firstNameOf(account.name)}`}
        lead="Seu resumo de indicações, incentivos e próximos passos."
      />

      <SummaryCards summary={referrals.summary} balanceCents={wallet.balanceCents} />

      {/* No celular o cupom vem antes da lista: copiar e compartilhar é o que mais se faz aqui. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <ReferralList referrals={referrals} period={period} className="order-2 lg:order-1" />
        <CouponPanel
          coupon={account.coupon}
          discountPercent={account.couponDiscountPercent}
          couponUses={referrals.summary.couponUses}
          className="order-1 lg:order-2"
        />
      </div>
    </>
  );
}

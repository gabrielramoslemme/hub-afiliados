import type { Metadata } from 'next';
import { PageHeading, StatementList, WalletCard } from '@/affiliate/features/area';
import { fetchAccount, fetchWallet } from '@/affiliate/features/area/data';

export const metadata: Metadata = { title: 'Carteira' };

export default async function WalletPage() {
  const [account, wallet] = await Promise.all([fetchAccount(), fetchWallet()]);

  return (
    <>
      <PageHeading title="Carteira" lead="Saldo, extrato e para onde o dinheiro vai." />

      {/*
        Em telas largas o saldo acompanha a rolagem do extrato: a resposta para
        "quanto eu tenho" não some quando a pessoa desce a lista.
      */}
      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <WalletCard
            wallet={wallet}
            pixKeyType={account.pixKeyType}
            maskedPixKey={account.maskedPixKey}
          />
        </div>

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-ink-900">Extrato</h2>
            <span className="text-[0.8125rem] text-ink-500">Últimos 30 dias</span>
          </div>

          <StatementList entries={wallet.entries} />
        </section>
      </div>
    </>
  );
}

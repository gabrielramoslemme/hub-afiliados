import type { CampaignParams } from '../lib/campaign-params';
import { CampaignsListing } from './campaigns-listing';
import { CurrentCampaign } from './current-campaign';

/**
 * A tela de campanhas do painel. Tudo aqui é Server Component lendo
 * `mock-data.ts` pelo recorte que veio na URL; só o menu de ações, o detalhe e o
 * filtro de categoria são ilha de cliente. Quando a leitura de verdade nascer, o
 * que muda é a origem do dado — a montagem continua igual.
 *
 * A tela nasce acima da dobra, então o movimento é por tempo e não pela timeline
 * de rolagem: `view()` mediria a posição de blocos que já estão na tela.
 */
export function CampaignsScreen({ params }: { params: CampaignParams }) {
  return (
    <>
      <div className="animate-rise">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink-900">Campanhas</h1>
        <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-ink-500">
          Cada campanha define a regra de bônus que o afiliado divulga no período. Uma fica no ar
          por vez, e o histórico não é apagado.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <section className="animate-rise [animation-delay:60ms]">
          <CurrentCampaign />
        </section>

        <section className="animate-rise [animation-delay:120ms]">
          <CampaignsListing params={params} />
        </section>
      </div>
    </>
  );
}

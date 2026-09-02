import { CAMPAIGN_STATUSES } from './campaign-display';
import { type CampaignParams, PAGE_SIZE } from './campaign-params';
import { type Campaign, campaigns } from './mock-data';

export interface CampaignListResult {
  data: Campaign[];
  total: number;
}

/**
 * O recorte da listagem em memória. É o que a API vai fazer com `WHERE`, `ORDER
 * BY` e `LIMIT` quando a tabela existir — e é por isso que o formato de retorno
 * é o mesmo `{ data, total }` de `PaginatedResult`: trocar isto por `data.ts`
 * não muda uma linha da tela.
 */
export function listCampaigns(params: CampaignParams): CampaignListResult {
  const term = params.search.toLowerCase();

  const filtered = campaigns.filter((campaign) => {
    if (params.status && campaign.status !== params.status) return false;
    if (params.category && campaign.category !== params.category) return false;
    if (!term) return true;

    // Nome e descrição juntos: o nome raramente diz a regra, e é a regra que a
    // analista lembra quando procura a campanha.
    return `${campaign.name} ${campaign.description} ${campaign.category}`
      .toLowerCase()
      .includes(term);
  });

  const direction = params.sortOrder === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => direction * compare(a, b, params.sortBy));

  const from = (params.page - 1) * PAGE_SIZE;

  return { data: sorted.slice(from, from + PAGE_SIZE), total: filtered.length };
}

function compare(a: Campaign, b: Campaign, sortBy: CampaignParams['sortBy']): number {
  switch (sortBy) {
    case 'name':
      return a.name.localeCompare(b.name, 'pt-BR');
    case 'category':
      return a.category.localeCompare(b.category, 'pt-BR');
    // Situação não ordena por alfabeto: "Agendada" antes de "Ativa" inverteria o
    // ciclo de vida, que é o que a coluna quer mostrar.
    case 'status':
      return CAMPAIGN_STATUSES.indexOf(a.status) - CAMPAIGN_STATUSES.indexOf(b.status);
    default:
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  }
}

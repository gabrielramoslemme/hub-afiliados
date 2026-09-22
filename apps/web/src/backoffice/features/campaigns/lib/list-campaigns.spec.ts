import { PAGE_SIZE, parseCampaignParams } from './campaign-params';
import { listCampaigns } from './list-campaigns';
import { campaigns, currentCampaign } from './mock-data';

describe('listCampaigns', () => {
  it('opens on the most recent period first', () => {
    const { data, total } = listCampaigns(parseCampaignParams({}));

    expect(total).toBe(campaigns.length);
    expect(data).toHaveLength(PAGE_SIZE);

    const starts = data.map((campaign) => new Date(campaign.startsAt).getTime());

    expect(starts).toEqual([...starts].sort((a, b) => b - a));
  });

  it('hands the rest of the listing to the second page', () => {
    const { data } = listCampaigns(parseCampaignParams({ page: '2' }));

    expect(data).toHaveLength(campaigns.length - PAGE_SIZE);
  });

  it('keeps the total of the cut, not of the page', () => {
    const { data, total } = listCampaigns(parseCampaignParams({ status: 'active' }));

    expect(total).toBe(1);
    expect(data).toEqual([currentCampaign]);
  });

  it('narrows the listing down to one category', () => {
    const { data } = listCampaigns(parseCampaignParams({ category: 'Chaveiro' }));

    expect(data.length).toBeGreaterThan(0);
    for (const campaign of data) {
      expect(campaign.category).toBe('Chaveiro');
    }
  });

  it('searches the name regardless of case', () => {
    const { data } = listCampaigns(parseCampaignParams({ search: 'ESTOFADOS' }));

    expect(data).toContainEqual(currentCampaign);
  });

  it('searches the description too, because the name alone rarely says the rule', () => {
    const { data } = listCampaigns(parseCampaignParams({ search: 'bônus' }));

    expect(data.length).toBeGreaterThan(0);
    for (const campaign of data) {
      expect(`${campaign.name} ${campaign.description}`.toLowerCase()).toContain('bônus');
    }
  });

  it('sorts by name when asked, in the order that was asked', () => {
    const { data } = listCampaigns(parseCampaignParams({ sortBy: 'name', sortOrder: 'asc' }));

    const names = data.map((campaign) => campaign.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  });

  it('empties the listing when nothing matches, instead of falling back to everything', () => {
    const { data, total } = listCampaigns(parseCampaignParams({ search: 'submarino' }));

    expect(data).toEqual([]);
    expect(total).toBe(0);
  });
});

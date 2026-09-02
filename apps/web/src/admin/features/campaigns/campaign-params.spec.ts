import { campaignsHref, parseCampaignParams } from './campaign-params';

describe('parseCampaignParams', () => {
  it('falls back to the first page ordered by the most recent period', () => {
    expect(parseCampaignParams({})).toEqual({
      page: 1,
      status: null,
      category: null,
      search: '',
      sortBy: 'startsAt',
      sortOrder: 'desc',
    });
  });

  it('reads a page that came as a string', () => {
    expect(parseCampaignParams({ page: '2' }).page).toBe(2);
  });

  it('refuses a page below the first one', () => {
    expect(parseCampaignParams({ page: '0' }).page).toBe(1);
  });

  it('refuses a page that is not a number', () => {
    expect(parseCampaignParams({ page: 'última' }).page).toBe(1);
  });

  it('keeps a status the listing knows', () => {
    expect(parseCampaignParams({ status: 'ended' }).status).toBe('ended');
  });

  it('drops a status the listing does not know', () => {
    expect(parseCampaignParams({ status: 'quase' }).status).toBeNull();
  });

  it('keeps a category the catalogue knows', () => {
    expect(parseCampaignParams({ category: 'Chaveiro' }).category).toBe('Chaveiro');
  });

  it('drops a category the catalogue does not know', () => {
    expect(parseCampaignParams({ category: 'Aviação' }).category).toBeNull();
  });

  it('drops a sort column that is not sortable', () => {
    expect(parseCampaignParams({ sortBy: 'participants' }).sortBy).toBe('startsAt');
  });

  it('trims the search term', () => {
    expect(parseCampaignParams({ search: '  estofados  ' }).search).toBe('estofados');
  });

  it('takes the first value when a param repeats', () => {
    expect(parseCampaignParams({ page: ['2', '9'] }).page).toBe(2);
  });
});

describe('campaignsHref', () => {
  const base = parseCampaignParams({});

  it('omits every default so the clean url stays clean', () => {
    expect(campaignsHref(base, {})).toBe('/admin/campanhas');
  });

  it('carries the filter that is not default', () => {
    expect(campaignsHref(base, { status: 'canceled' })).toBe('/admin/campanhas?status=canceled');
  });

  it('escapes a category with a space in it', () => {
    expect(campaignsHref(base, { category: 'Serviços Residenciais' })).toBe(
      '/admin/campanhas?category=Servi%C3%A7os+Residenciais',
    );
  });

  it('goes back to the first page whenever the cut changes', () => {
    const onPageFour = parseCampaignParams({ page: '4' });

    expect(campaignsHref(onPageFour, { status: 'ended' })).toBe('/admin/campanhas?status=ended');
  });

  it('keeps the page when only the page changes', () => {
    const filtered = parseCampaignParams({ status: 'ended' });

    expect(campaignsHref(filtered, { page: 2 })).toBe('/admin/campanhas?status=ended&page=2');
  });
});

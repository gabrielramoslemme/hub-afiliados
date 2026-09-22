import { AffiliateStatusEnum } from '@porto/contracts';
import { parseQueueParams, queueHref } from './queue-params';

describe('parseQueueParams', () => {
  it('falls back to the first page ordered by newest', () => {
    expect(parseQueueParams({})).toEqual({
      page: 1,
      status: null,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('reads a page that came as a string', () => {
    expect(parseQueueParams({ page: '3' }).page).toBe(3);
  });

  it('refuses a page below the first one', () => {
    expect(parseQueueParams({ page: '0' }).page).toBe(1);
  });

  it('refuses a page that is not a number', () => {
    expect(parseQueueParams({ page: 'última' }).page).toBe(1);
  });

  it('keeps a status the api knows', () => {
    expect(parseQueueParams({ status: 'APPROVED' }).status).toBe(AffiliateStatusEnum.APPROVED);
  });

  it('drops a status the api does not know', () => {
    expect(parseQueueParams({ status: 'ALMOST' }).status).toBeNull();
  });

  it('drops a sort column that is not sortable', () => {
    expect(parseQueueParams({ sortBy: 'cpf' }).sortBy).toBe('createdAt');
  });

  it('trims the search term', () => {
    expect(parseQueueParams({ search: '  marina  ' }).search).toBe('marina');
  });

  it('takes the first value when a param repeats', () => {
    expect(parseQueueParams({ page: ['2', '9'] }).page).toBe(2);
  });
});

describe('queueHref', () => {
  const base = parseQueueParams({});

  it('omits every default so the clean url stays clean', () => {
    expect(queueHref(base, {})).toBe('/admin/afiliados');
  });

  it('carries the filter that is not default', () => {
    expect(queueHref(base, { status: AffiliateStatusEnum.REJECTED })).toBe(
      '/admin/afiliados?status=REJECTED',
    );
  });

  it('goes back to the first page when the filter changes', () => {
    const onPageFour = parseQueueParams({ page: '4' });

    expect(queueHref(onPageFour, { status: AffiliateStatusEnum.APPROVED })).toBe(
      '/admin/afiliados?status=APPROVED',
    );
  });

  it('goes back to the first page when the sort changes', () => {
    const onPageFour = parseQueueParams({ page: '4' });

    expect(queueHref(onPageFour, { sortBy: 'name' })).toBe('/admin/afiliados?sortBy=name');
  });

  it('keeps the filter when only the page changes', () => {
    const filtered = parseQueueParams({ status: 'APPROVED' });

    expect(queueHref(filtered, { page: 2 })).toBe('/admin/afiliados?status=APPROVED&page=2');
  });
});

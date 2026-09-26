import { WithdrawalStatusEnum } from '@porto/contracts';
import { parsePayoutsParams, payoutsHref } from './payouts-params';

describe('parsePayoutsParams', () => {
  it('reads page, status, search and the day range from the url', () => {
    expect(
      parsePayoutsParams({
        page: '3',
        status: 'PAID',
        search: ' marina ',
        from: '2026-09-01',
        until: '2026-09-30',
      }),
    ).toEqual({
      page: 3,
      status: WithdrawalStatusEnum.PAID,
      search: 'marina',
      from: '2026-09-01',
      until: '2026-09-30',
    });
  });

  // A URL vem do usuário: o que a API recusaria vira o padrão aqui, e não 400 lá.
  it('falls back to the defaults for anything the api would refuse', () => {
    expect(
      parsePayoutsParams({ page: '0', status: 'LOST', from: '25/09/2026', until: 'ontem' }),
    ).toEqual({ page: 1, status: null, search: '', from: null, until: null });
  });
});

describe('payoutsHref', () => {
  it('goes back to the first page when a filter changes', () => {
    const current = parsePayoutsParams({ page: '4' });

    expect(payoutsHref(current, { status: WithdrawalStatusEnum.FAILED })).toBe(
      '/admin/pagamentos?status=FAILED',
    );
  });

  it('keeps the filters when only the page changes', () => {
    const current = parsePayoutsParams({ status: 'PAID', search: 'marina' });

    expect(payoutsHref(current, { page: 2 })).toBe(
      '/admin/pagamentos?status=PAID&search=marina&page=2',
    );
  });
});

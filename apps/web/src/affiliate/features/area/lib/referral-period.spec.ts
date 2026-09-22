import { ReferralPeriodEnum } from '@porto/contracts';
import { parseReferralPeriod, referralPeriodHref } from './referral-period';

describe('parseReferralPeriod', () => {
  it('reads the period the affiliate picked from the address', () => {
    expect(parseReferralPeriod({ periodo: 'ano' })).toBe(ReferralPeriodEnum.YEAR);
    expect(parseReferralPeriod({ periodo: 'tudo' })).toBe(ReferralPeriodEnum.ALL);
  });

  /*
    A URL vem de quem digita. Um valor desconhecido que chegasse à API voltaria
    400 e derrubaria a tela inicial inteira por causa de um filtro da lista.
  */
  it('falls back to the thirty days on a period it does not know', () => {
    expect(parseReferralPeriod({ periodo: 'semana' })).toBe(ReferralPeriodEnum.LAST_30_DAYS);
    expect(parseReferralPeriod({ periodo: 'YEAR' })).toBe(ReferralPeriodEnum.LAST_30_DAYS);
  });

  it('opens on the thirty days', () => {
    expect(parseReferralPeriod({})).toBe(ReferralPeriodEnum.LAST_30_DAYS);
  });

  it('takes the first value when the parameter repeats', () => {
    expect(parseReferralPeriod({ periodo: ['tudo', 'ano'] })).toBe(ReferralPeriodEnum.ALL);
  });
});

describe('referralPeriodHref', () => {
  it('leaves the default period out of the address', () => {
    expect(referralPeriodHref(ReferralPeriodEnum.LAST_30_DAYS)).toBe('/minha-conta');
  });

  it('round-trips every period through the address', () => {
    for (const period of Object.values(ReferralPeriodEnum)) {
      const query = new URL(referralPeriodHref(period), 'http://x').searchParams;

      expect(parseReferralPeriod({ periodo: query.get('periodo') ?? undefined })).toBe(period);
    }
  });
});

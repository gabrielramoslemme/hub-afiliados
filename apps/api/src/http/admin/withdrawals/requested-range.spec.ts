import { toRequestedRange } from './requested-range';

describe('toRequestedRange', () => {
  it('converts a from filter (Brasília) to the start of that day in UTC', () => {
    const { requestedFrom } = toRequestedRange({ from: '2026-09-25' });

    expect(requestedFrom).toEqual(new Date('2026-09-25T03:00:00.000Z'));
  });

  // O saque das 23:59 em Brasília no dia 25 ainda tem que entrar no filtro:
  // por isso o limite superior é o começo do dia seguinte, exclusive.
  it('converts an until filter to the start of the next Brasília day, exclusive', () => {
    const { requestedUntil } = toRequestedRange({ until: '2026-09-25' });

    expect(requestedUntil).toEqual(new Date('2026-09-26T03:00:00.000Z'));
  });

  it('returns both bounds null when neither filter is given', () => {
    expect(toRequestedRange({})).toEqual({ requestedFrom: null, requestedUntil: null });
  });
});

import { sanitizeSocialHandle } from './social-handle.util';

describe('sanitizeSocialHandle', () => {
  it('drops the leading at and the surrounding spaces', () => {
    expect(sanitizeSocialHandle('  @marina.ferraz ')).toBe('marina.ferraz');
  });

  it('keeps a handle already without the at', () => {
    expect(sanitizeSocialHandle('marinaferraz')).toBe('marinaferraz');
  });

  it('preserves the case the person typed', () => {
    expect(sanitizeSocialHandle('@MarinaFerraz')).toBe('MarinaFerraz');
  });
});

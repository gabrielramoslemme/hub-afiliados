import { isValidSocialHandle, sanitizeSocialHandle } from './social-handle.util';

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

describe('isValidSocialHandle', () => {
  it('accepts letters, digits, dot, underscore and hyphen', () => {
    expect(isValidSocialHandle('@marina_ferraz.01-oficial')).toBe(true);
  });

  it('rejects a handle with a space', () => {
    expect(isValidSocialHandle('marina ferraz')).toBe(false);
  });

  it('rejects a handle with a slash', () => {
    expect(isValidSocialHandle('instagram.com/marina')).toBe(false);
  });

  it('rejects an empty handle', () => {
    expect(isValidSocialHandle('@')).toBe(false);
  });

  it('rejects a handle longer than thirty characters', () => {
    expect(isValidSocialHandle('a'.repeat(31))).toBe(false);
  });
});

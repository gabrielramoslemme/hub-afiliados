import { isValidCouponCode, sanitizeCouponCode } from './coupon-code.util';

describe('sanitizeCouponCode', () => {
  it('uppercases the code', () => {
    expect(sanitizeCouponCode('marina25')).toBe('MARINA25');
  });

  it('drops surrounding spaces', () => {
    expect(sanitizeCouponCode('  MARINA25  ')).toBe('MARINA25');
  });

  it('keeps an inner space so the code is rejected instead of silently changed', () => {
    expect(sanitizeCouponCode('MARINA 25')).toBe('MARINA 25');
  });
});

describe('isValidCouponCode', () => {
  it('accepts letters and digits', () => {
    expect(isValidCouponCode('MARINA25')).toBe(true);
  });

  it('accepts a lowercase code, because sanitizing comes first', () => {
    expect(isValidCouponCode('marina25')).toBe(true);
  });

  it('accepts the shortest allowed code', () => {
    expect(isValidCouponCode('ABCD')).toBe(true);
  });

  it('accepts the longest allowed code', () => {
    expect(isValidCouponCode('A'.repeat(20))).toBe(true);
  });

  it('rejects a code shorter than four characters', () => {
    expect(isValidCouponCode('ABC')).toBe(false);
  });

  it('rejects a code longer than twenty characters', () => {
    expect(isValidCouponCode('A'.repeat(21))).toBe(false);
  });

  it('rejects a code with an inner space', () => {
    expect(isValidCouponCode('MARINA 25')).toBe(false);
  });

  it('rejects a code with punctuation', () => {
    expect(isValidCouponCode('MARINA-25')).toBe(false);
  });

  it('rejects an accented code, because the checkout keyboard may not have it', () => {
    expect(isValidCouponCode('MARINAÇÃO')).toBe(false);
  });

  it('rejects an empty code', () => {
    expect(isValidCouponCode('   ')).toBe(false);
  });
});

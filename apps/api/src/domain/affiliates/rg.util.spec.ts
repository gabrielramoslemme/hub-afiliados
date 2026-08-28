import { isValidRg, maskRg, sanitizeRg } from './rg.util';

describe('sanitizeRg', () => {
  it('keeps letters and digits, dropping the punctuation', () => {
    expect(sanitizeRg('12.345.678-X')).toBe('12345678X');
  });

  it('uppercases the letters', () => {
    expect(sanitizeRg('12345678x')).toBe('12345678X');
  });

  it('drops surrounding spaces', () => {
    expect(sanitizeRg('  123456789  ')).toBe('123456789');
  });
});

describe('isValidRg', () => {
  it('accepts a digits only rg', () => {
    expect(isValidRg('123456789')).toBe(true);
  });

  it('accepts an rg ending in a letter', () => {
    expect(isValidRg('12.345.678-X')).toBe(true);
  });

  it('rejects an rg shorter than five characters', () => {
    expect(isValidRg('1234')).toBe(false);
  });

  it('rejects an rg longer than twenty characters', () => {
    expect(isValidRg('1'.repeat(21))).toBe(false);
  });

  it('rejects an rg with a symbol that is not punctuation', () => {
    expect(isValidRg('12345678/SP')).toBe(false);
  });

  it('rejects an empty rg', () => {
    expect(isValidRg('   ')).toBe(false);
  });
});

describe('maskRg', () => {
  it('preserves only the four last characters', () => {
    expect(maskRg('12345678X')).toBe('*****678X');
  });

  it('masks an rg it cannot read', () => {
    expect(maskRg('1')).toBe('*****');
  });
});

import { isValidCpf, maskCpf, sanitizeCpf } from './cpf.util';

describe('cpf.util', () => {
  describe('sanitizeCpf', () => {
    it('strips punctuation', () => {
      expect(sanitizeCpf('529.982.247-25')).toBe('52998224725');
    });
  });

  describe('isValidCpf', () => {
    it('accepts a CPF with a valid check digit', () => {
      expect(isValidCpf('529.982.247-25')).toBe(true);
    });

    it('rejects a CPF with an invalid check digit', () => {
      expect(isValidCpf('529.982.247-26')).toBe(false);
    });

    it('rejects a sequence of identical digits', () => {
      expect(isValidCpf('111.111.111-11')).toBe(false);
    });
  });

  describe('maskCpf', () => {
    it('hides the first six digits', () => {
      expect(maskCpf('52998224725')).toBe('***.***.247-25');
    });
  });
});

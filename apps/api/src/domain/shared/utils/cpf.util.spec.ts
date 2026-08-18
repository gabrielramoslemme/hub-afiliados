import { isValidCpf, maskCpf, sanitizeCpf } from './cpf.util';

describe('cpf.util', () => {
  describe('sanitizeCpf', () => {
    it('remove pontuação', () => {
      expect(sanitizeCpf('529.982.247-25')).toBe('52998224725');
    });
  });

  describe('isValidCpf', () => {
    it('aceita um CPF com dígito verificador correto', () => {
      expect(isValidCpf('529.982.247-25')).toBe(true);
    });

    it('rejeita um CPF com dígito verificador errado', () => {
      expect(isValidCpf('529.982.247-26')).toBe(false);
    });

    it('rejeita uma sequência de dígitos iguais', () => {
      expect(isValidCpf('111.111.111-11')).toBe(false);
    });
  });

  describe('maskCpf', () => {
    it('esconde os seis primeiros dígitos', () => {
      expect(maskCpf('52998224725')).toBe('***.***.247-25');
    });
  });
});

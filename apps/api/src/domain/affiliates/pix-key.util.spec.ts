import { PixKeyTypeEnum } from '@porto/contracts';
import { isValidPixKey, maskPixKey, normalizePixKey } from './pix-key.util';

describe('pix-key.util', () => {
  describe('isValidPixKey', () => {
    it('accepts a well formed email', () => {
      expect(isValidPixKey(PixKeyTypeEnum.EMAIL, 'marina@email.com')).toBe(true);
    });

    it('rejects an email without a domain', () => {
      expect(isValidPixKey(PixKeyTypeEnum.EMAIL, 'marina@')).toBe(false);
    });

    it('rejects an email with a space', () => {
      expect(isValidPixKey(PixKeyTypeEnum.EMAIL, 'marina @email.com')).toBe(false);
    });

    it('rejects an empty email', () => {
      expect(isValidPixKey(PixKeyTypeEnum.EMAIL, '')).toBe(false);
    });

    it('accepts a phone with 11 digits', () => {
      expect(isValidPixKey(PixKeyTypeEnum.PHONE, '(11) 99999-9999')).toBe(true);
    });

    it('accepts a phone with the country code, 13 digits', () => {
      expect(isValidPixKey(PixKeyTypeEnum.PHONE, '+5511999999999')).toBe(true);
    });

    it('rejects a phone with 9 digits', () => {
      expect(isValidPixKey(PixKeyTypeEnum.PHONE, '999999999')).toBe(false);
    });

    it('rejects a phone with 14 digits', () => {
      expect(isValidPixKey(PixKeyTypeEnum.PHONE, '55511999999999')).toBe(false);
    });

    it('accepts a CPF with a valid check digit', () => {
      expect(isValidPixKey(PixKeyTypeEnum.CPF, '529.982.247-25')).toBe(true);
    });

    it('rejects a CPF with an invalid check digit', () => {
      expect(isValidPixKey(PixKeyTypeEnum.CPF, '529.982.247-26')).toBe(false);
    });
  });

  describe('normalizePixKey', () => {
    it('strips punctuation from a CPF key', () => {
      expect(normalizePixKey(PixKeyTypeEnum.CPF, '529.982.247-25')).toBe('52998224725');
    });

    it('trims and lowercases an email key', () => {
      expect(normalizePixKey(PixKeyTypeEnum.EMAIL, ' Marina@Email.com ')).toBe('marina@email.com');
    });

    it('strips punctuation from a phone key', () => {
      expect(normalizePixKey(PixKeyTypeEnum.PHONE, '(11) 99999-9999')).toBe('11999999999');
    });
  });

  describe('maskPixKey', () => {
    it('keeps the domain and the first letters of an email', () => {
      expect(maskPixKey(PixKeyTypeEnum.EMAIL, 'marina.ferraz@email.com')).toBe(
        'ma***********@email.com',
      );
    });

    it('keeps the area code and the last four digits of a phone', () => {
      expect(maskPixKey(PixKeyTypeEnum.PHONE, '11999998888')).toBe('(11) *****-8888');
    });

    it('shows the area code, not the country code, of a phone saved with +55', () => {
      expect(maskPixKey(PixKeyTypeEnum.PHONE, '+55 (11) 99999-8888')).toBe('(11) *****-8888');
    });

    it('masks a cpf key the same way the listing masks the cpf', () => {
      expect(maskPixKey(PixKeyTypeEnum.CPF, '52998224725')).toBe('***.***.247-25');
    });

    it('does not leak a one letter local part', () => {
      expect(maskPixKey(PixKeyTypeEnum.EMAIL, 'a@email.com')).toBe('*@email.com');
    });
  });
});

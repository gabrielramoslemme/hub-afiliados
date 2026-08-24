import { PixKeyTypeEnum } from '@porto/contracts';
import { formatCpf, formatPhone, formatPixKey, onlyDigits } from './masks';

describe('masks', () => {
  describe('onlyDigits', () => {
    it('keeps digits and drops everything else', () => {
      expect(onlyDigits('529.982.247-25')).toBe('52998224725');
    });

    it('returns an empty string when there is no digit', () => {
      expect(onlyDigits('abc')).toBe('');
    });
  });

  describe('formatCpf', () => {
    it('formats a complete cpf', () => {
      expect(formatCpf('52998224725')).toBe('529.982.247-25');
    });

    it('formats while the person is still typing', () => {
      expect(formatCpf('5299')).toBe('529.9');
    });

    it('does not add a separator before it is due', () => {
      expect(formatCpf('529')).toBe('529');
    });

    it('is idempotent over an already formatted cpf', () => {
      expect(formatCpf('529.982.247-25')).toBe('529.982.247-25');
    });

    it('drops digits beyond the eleventh', () => {
      expect(formatCpf('5299822472599')).toBe('529.982.247-25');
    });

    it('returns an empty string for an empty input', () => {
      expect(formatCpf('')).toBe('');
    });
  });

  describe('formatPhone', () => {
    it('formats a mobile number with nine digits', () => {
      expect(formatPhone('11999999999')).toBe('(11) 99999-9999');
    });

    it('formats a landline with eight digits', () => {
      expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    });

    it('opens the area code while the person is still typing', () => {
      expect(formatPhone('11')).toBe('(11');
    });

    it('closes the area code once the number starts', () => {
      expect(formatPhone('119')).toBe('(11) 9');
    });

    it('drops digits beyond the eleventh', () => {
      expect(formatPhone('119999999999999')).toBe('(11) 99999-9999');
    });
  });

  describe('formatPixKey', () => {
    it('masks a pix key of type cpf as a cpf', () => {
      expect(formatPixKey(PixKeyTypeEnum.CPF, '52998224725')).toBe('529.982.247-25');
    });

    it('masks a pix key of type phone as a phone', () => {
      expect(formatPixKey(PixKeyTypeEnum.PHONE, '11999999999')).toBe('(11) 99999-9999');
    });

    it('leaves a pix key of type email untouched', () => {
      expect(formatPixKey(PixKeyTypeEnum.EMAIL, 'Marina@Email.com')).toBe('Marina@Email.com');
    });
  });
});

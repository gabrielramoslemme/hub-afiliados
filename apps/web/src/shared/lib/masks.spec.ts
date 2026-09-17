import { PixKeyTypeEnum } from '@porto/contracts';
import {
  formatCpf,
  formatPhone,
  formatPixKey,
  formatRg,
  formatSocialHandle,
  onlyDigits,
  pixKeyPlaceholder,
} from './masks';

describe('masks', () => {
  describe('onlyDigits', () => {
    it('keeps digits and drops everything else', () => {
      expect(onlyDigits('529.982.247-25')).toBe('52998224725');
    });

    it('returns an empty string when there is no digit', () => {
      expect(onlyDigits('abc')).toBe('');
    });
  });

  describe('formatRg', () => {
    it('formats the shape most states issue', () => {
      expect(formatRg('123456789')).toBe('12.345.678-9');
    });

    it('formats an rg whose last character is a letter', () => {
      expect(formatRg('12345678X')).toBe('12.345.678-X');
    });

    it('uppercases the letter as the person types it', () => {
      expect(formatRg('12345678x')).toBe('12.345.678-X');
    });

    it('formats while the person is still typing', () => {
      expect(formatRg('1234')).toBe('12.34');
    });

    it('does not add a separator before it is due', () => {
      expect(formatRg('12')).toBe('12');
    });

    it('is idempotent over an already formatted rg', () => {
      expect(formatRg('12.345.678-X')).toBe('12.345.678-X');
    });

    /*
      Estado que emite RG mais longo continua legível: o agrupamento para no
      hífen e o resto segue depois, em vez de a pontuação sumir de uma vez
      quando o décimo caractere é digitado.
    */
    it('keeps a longer rg grouped instead of dropping the punctuation', () => {
      expect(formatRg('1234567890123')).toBe('12.345.678-90123');
    });

    it('stops at the twenty characters the column holds', () => {
      expect(formatRg('1'.repeat(30)).replace(/\D/g, '')).toHaveLength(20);
    });

    it('drops what is not part of an rg', () => {
      expect(formatRg('12 345 678')).toBe('12.345.678');
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

  describe('pixKeyPlaceholder', () => {
    /* Exemplo que a máscara reformataria mostraria um formato que o campo não aceita. */
    it.each(Object.values(PixKeyTypeEnum))(
      'shows an example already shaped by the %s mask',
      (type) => {
        const placeholder = pixKeyPlaceholder(type);

        expect(placeholder).not.toBe('');
        expect(formatPixKey(type, placeholder)).toBe(placeholder);
      },
    );
  });

  describe('formatSocialHandle', () => {
    it('drops the spaces no profile can have', () => {
      expect(formatSocialHandle('marina ferraz')).toBe('marinaferraz');
    });

    it('drops the spaces around a pasted handle', () => {
      expect(formatSocialHandle('  marina.ferraz\n')).toBe('marina.ferraz');
    });

    it('drops the at sign the field already frames', () => {
      expect(formatSocialHandle('@marina.ferraz')).toBe('marina.ferraz');
    });

    it('leaves a handle the schema accepts untouched', () => {
      expect(formatSocialHandle('marina_ferraz-01')).toBe('marina_ferraz-01');
    });

    /*
      Engolir o que não é espaço mudaria o perfil sem a pessoa perceber — quem
      digita uma barra fica com o erro do schema, e não com outro `@`.
    */
    it('keeps a character the schema rejects so the field can refuse it', () => {
      expect(formatSocialHandle('marina/ferraz')).toBe('marina/ferraz');
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

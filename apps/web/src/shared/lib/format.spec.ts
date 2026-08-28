import { PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';
import {
  formatBRL,
  formatCpfDisplay,
  formatDate,
  formatDateTime,
  formatPixKeyDisplay,
  formatSocialProfile,
  formatTime,
  socialNetworkName,
} from './format';

describe('formatDateTime', () => {
  it('renders an iso instant in são paulo time', () => {
    expect(formatDateTime('2026-08-19T14:24:00.000Z')).toBe('19/08/2026 11:24');
  });

  it('does not drift with the timezone of the machine running it', () => {
    const original = process.env.TZ;
    process.env.TZ = 'UTC';

    expect(formatDateTime('2026-08-19T14:24:00.000Z')).toBe('19/08/2026 11:24');

    process.env.TZ = original;
  });
});

describe('formatDate', () => {
  it('renders the day without the time', () => {
    expect(formatDate('2026-08-19T14:24:00.000Z')).toBe('19/08/2026');
  });
});

describe('formatTime', () => {
  it('renders the time without the day, in são paulo', () => {
    expect(formatTime('2026-08-19T14:24:00.000Z')).toBe('11:24');
  });

  it('does not drift with the timezone of the machine running it', () => {
    const original = process.env.TZ;
    process.env.TZ = 'UTC';

    expect(formatTime('2026-08-19T14:24:00.000Z')).toBe('11:24');

    process.env.TZ = original;
  });
});

describe('formatCpfDisplay', () => {
  it('punctuates a cpf stored as digits', () => {
    expect(formatCpfDisplay('52998224725')).toBe('529.982.247-25');
  });

  it('leaves an already masked cpf untouched', () => {
    expect(formatCpfDisplay('***.***.247-25')).toBe('***.***.247-25');
  });
});

describe('formatPixKeyDisplay', () => {
  it('punctuates a pix key of type cpf', () => {
    expect(formatPixKeyDisplay(PixKeyTypeEnum.CPF, '52998224725')).toBe('529.982.247-25');
  });

  it('punctuates a pix key of type phone', () => {
    expect(formatPixKeyDisplay(PixKeyTypeEnum.PHONE, '11987654321')).toBe('(11) 98765-4321');
  });

  it('leaves an email key untouched', () => {
    expect(formatPixKeyDisplay(PixKeyTypeEnum.EMAIL, 'marina@email.com')).toBe('marina@email.com');
  });
});

/*
  O separador entre `R$` e o número é espaço inseparável (U+00A0), como o `Intl`
  emite. Escrito como escape e não como o caractere: literal, ele é
  indistinguível de um espaço comum na revisão, e a diferença é justamente o que
  impede o símbolo de cair sozinho no fim da linha.
*/
describe('formatBRL', () => {
  it('formats cents as brazilian currency', () => {
    expect(formatBRL(72000)).toBe('R$\u00a0720,00');
  });

  it('keeps the cents that do not round to a whole real', () => {
    expect(formatBRL(32050)).toBe('R$\u00a0320,50');
  });

  it('formats zero', () => {
    expect(formatBRL(0)).toBe('R$\u00a00,00');
  });
});

describe('formatSocialProfile', () => {
  it('reads the handle followed by the network', () => {
    expect(formatSocialProfile(SocialNetworkEnum.INSTAGRAM, 'marina.ferraz')).toBe(
      '@marina.ferraz no Instagram',
    );
  });

  it('names each network the way the brand writes it', () => {
    expect(formatSocialProfile(SocialNetworkEnum.TIKTOK, 'marina')).toBe('@marina no TikTok');
    expect(formatSocialProfile(SocialNetworkEnum.YOUTUBE, 'marina')).toBe('@marina no YouTube');
    expect(formatSocialProfile(SocialNetworkEnum.X, 'marina')).toBe('@marina no X');
    expect(formatSocialProfile(SocialNetworkEnum.KWAI, 'marina')).toBe('@marina no Kwai');
  });

  it('names every network the enum carries', () => {
    for (const network of Object.values(SocialNetworkEnum)) {
      expect(formatSocialProfile(network, 'marina')).toBe(
        `@marina no ${socialNetworkName(network)}`,
      );
    }
  });

  it('does not repeat the at the person already typed', () => {
    expect(formatSocialProfile(SocialNetworkEnum.FACEBOOK, '@marina')).toBe('@marina no Facebook');
  });

  it('has nothing to show when the affiliate informed no network', () => {
    expect(formatSocialProfile(null, null)).toBeNull();
  });

  it('has nothing to show when half of the pair is missing', () => {
    expect(formatSocialProfile(SocialNetworkEnum.INSTAGRAM, null)).toBeNull();
    expect(formatSocialProfile(null, 'marina')).toBeNull();
  });
});

import { AuthAudienceEnum } from '@porto/contracts';
import { configServiceMock } from '@Testing/mocks/services/config-service.mock';
import { AppLinkBuilder } from './app-link-builder';

describe('AppLinkBuilder', () => {
  it('points the set-password link at the affiliate portal', () => {
    const builder = new AppLinkBuilder(
      configServiceMock({ APP_BASE_URL: 'https://afiliados.porto.example' }),
    );

    expect(builder.setPasswordLink('abc123')).toBe(
      'https://afiliados.porto.example/definir-senha?token=abc123',
    );
  });

  it('does not double the slash when the base url ends with one', () => {
    const builder = new AppLinkBuilder(
      configServiceMock({ APP_BASE_URL: 'https://afiliados.porto.example/' }),
    );

    expect(builder.setPasswordLink('abc123')).toBe(
      'https://afiliados.porto.example/definir-senha?token=abc123',
    );
  });

  it('escapes the token', () => {
    const builder = new AppLinkBuilder(
      configServiceMock({ APP_BASE_URL: 'https://afiliados.porto.example' }),
    );

    expect(builder.setPasswordLink('a+b/c')).toBe(
      'https://afiliados.porto.example/definir-senha?token=a%2Bb%2Fc',
    );
  });

  it('points the recovery link at the screen of the affiliate', () => {
    const builder = new AppLinkBuilder(
      configServiceMock({ APP_BASE_URL: 'https://afiliados.porto.example' }),
    );

    expect(builder.resetPasswordLink('abc123', AuthAudienceEnum.AFFILIATE)).toBe(
      'https://afiliados.porto.example/redefinir-senha?token=abc123',
    );
  });

  it('points the recovery link at the screen of the panel', () => {
    const builder = new AppLinkBuilder(
      configServiceMock({ APP_BASE_URL: 'https://afiliados.porto.example/' }),
    );

    expect(builder.resetPasswordLink('abc123', AuthAudienceEnum.ADMIN)).toBe(
      'https://afiliados.porto.example/admin/redefinir-senha?token=abc123',
    );
  });
});

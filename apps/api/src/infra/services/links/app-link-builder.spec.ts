import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
import { AppLinkBuilder } from './app-link-builder';

function envWith(appBaseUrl: string): EnvironmentVariableService {
  return { appBaseUrl } as unknown as EnvironmentVariableService;
}

describe('AppLinkBuilder', () => {
  it('points the set-password link at the affiliate portal', () => {
    const builder = new AppLinkBuilder(envWith('https://afiliados.porto.example'));

    expect(builder.setPasswordLink('abc123')).toBe(
      'https://afiliados.porto.example/definir-senha?token=abc123',
    );
  });

  it('does not double the slash when the base url ends with one', () => {
    const builder = new AppLinkBuilder(envWith('https://afiliados.porto.example/'));

    expect(builder.setPasswordLink('abc123')).toBe(
      'https://afiliados.porto.example/definir-senha?token=abc123',
    );
  });

  it('escapes the token', () => {
    const builder = new AppLinkBuilder(envWith('https://afiliados.porto.example'));

    expect(builder.setPasswordLink('a+b/c')).toBe(
      'https://afiliados.porto.example/definir-senha?token=a%2Bb%2Fc',
    );
  });
});

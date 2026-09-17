import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthAudienceEnum } from '@porto/contracts';
import { LinkBuilder } from '@Domain/notifications/link-builder';
import { EnvironmentVariables } from '@Infra/config/environment-variables';

const SET_PASSWORD_PATH = '/definir-senha';

/**
 * Uma variável só para os dois públicos: o painel é servido pelo mesmo Next que
 * serve o portal, então o que muda entre eles é o caminho, não o endereço.
 */
const RESET_PASSWORD_PATH: Record<AuthAudienceEnum, string> = {
  [AuthAudienceEnum.AFFILIATE]: '/redefinir-senha',
  [AuthAudienceEnum.ADMIN]: '/admin/redefinir-senha',
};

@Injectable()
export class AppLinkBuilder implements LinkBuilder {
  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  setPasswordLink(token: string): string {
    return this.linkTo(SET_PASSWORD_PATH, token);
  }

  resetPasswordLink(token: string, audience: AuthAudienceEnum): string {
    return this.linkTo(RESET_PASSWORD_PATH[audience], token);
  }

  private linkTo(path: string, token: string): string {
    const base = this.configService.get('APP_BASE_URL', { infer: true }).replace(/\/$/, '');

    return `${base}${path}?token=${encodeURIComponent(token)}`;
  }
}

import { Injectable } from '@nestjs/common';
import { LinkBuilder } from '@Domain/notifications/link-builder';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';

const SET_PASSWORD_PATH = '/definir-senha';

@Injectable()
export class AppLinkBuilder implements LinkBuilder {
  constructor(private readonly environmentVariableService: EnvironmentVariableService) {}

  setPasswordLink(token: string): string {
    const base = this.environmentVariableService.appBaseUrl.replace(/\/$/, '');

    return `${base}${SET_PASSWORD_PATH}?token=${encodeURIComponent(token)}`;
  }
}

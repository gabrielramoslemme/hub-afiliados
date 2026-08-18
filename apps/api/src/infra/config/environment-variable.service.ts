import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentVariableService {
  constructor(private readonly config: ConfigService) {}

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new Error(`Missing environment variable: ${key}`);
    return value;
  }

  get nodeEnv(): string { return this.required('NODE_ENV'); }
  get isProduction(): boolean { return this.nodeEnv === 'production'; }
  get port(): number { return Number(this.config.get('PORT') ?? 3000); }
  get databaseUrl(): string { return this.required('DATABASE_URL'); }
  get jwtSecret(): string { return this.required('JWT_SECRET'); }
  get appBaseUrl(): string { return this.required('APP_BASE_URL'); }
  get panelBaseUrl(): string { return this.required('PANEL_BASE_URL'); }

  get mailProvider(): 'mailersend' | 'logger' {
    return (this.config.get<string>('MAIL_PROVIDER') ?? 'logger') as 'mailersend' | 'logger';
  }
  get mailerSendApiKey(): string { return this.config.get<string>('MAILERSEND_API_KEY') ?? ''; }
  get mailFromEmail(): string { return this.required('MAILERSEND_FROM_EMAIL'); }
  get mailFromName(): string { return this.required('MAILERSEND_FROM_NAME'); }
  mailTemplateId(key: string): string { return this.config.get<string>(key) ?? ''; }
}

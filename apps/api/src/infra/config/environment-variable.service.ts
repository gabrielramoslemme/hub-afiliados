import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentVariableService {
  constructor(private readonly configService: ConfigService) {}

  private required(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new Error(`Missing environment variable: ${key}`);
    return value;
  }

  get nodeEnv(): string {
    return this.required('NODE_ENV');
  }
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
  get port(): number {
    return Number(this.configService.get('PORT') ?? 3000);
  }
  get databaseUrl(): string {
    return this.required('DATABASE_URL');
  }
  get jwtSecret(): string {
    return this.required('JWT_SECRET');
  }
  /**
   * Em segundos, a mesma unidade do cookie de sessão do painel, e o mesmo valor:
   * token que morre antes do cookie vira 401 numa tela que se acha logada.
   */
  get jwtExpiresInSeconds(): number {
    return Number(this.configService.get('JWT_EXPIRES_IN_SECONDS') ?? 28800);
  }
  get appBaseUrl(): string {
    return this.required('APP_BASE_URL');
  }
  get panelBaseUrl(): string {
    return this.required('PANEL_BASE_URL');
  }

  get mailProvider(): 'resend' | 'logger' {
    return (this.configService.get<string>('MAIL_PROVIDER') ?? 'logger') as 'resend' | 'logger';
  }
  get resendApiKey(): string {
    return this.configService.get<string>('RESEND_API_KEY') ?? '';
  }
  /** Remetente e nome de exibição não são do fornecedor: valem em qualquer um. */
  get mailFromEmail(): string {
    return this.required('MAIL_FROM_EMAIL');
  }
  get mailFromName(): string {
    return this.required('MAIL_FROM_NAME');
  }
}

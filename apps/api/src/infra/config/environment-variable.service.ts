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
  /**
   * O Postgres do desenvolvimento não fala TLS; o RDS, com `rds.force_ssl = 1`,
   * não fala outra coisa. Quem liga é o `install-release.sh`.
   */
  get databaseSsl(): boolean {
    return this.configService.get<boolean>('DATABASE_SSL') ?? false;
  }
  /** Sem valor aqui, o caminho padrão é o que a imagem carrega. */
  get databaseCaPath(): string | undefined {
    return this.configService.get<string>('DATABASE_CA_PATH');
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

  get portoOauthUrl(): string {
    return this.required('PORTO_OAUTH_URL');
  }
  get portoApiBaseUrl(): string {
    return this.required('PORTO_API_BASE_URL');
  }
  /** O prefixo do produto no gateway, antes do `/v1` do INT-01. */
  get portoApiBasePath(): string {
    return this.required('PORTO_API_BASE_PATH');
  }
  get portoClientId(): string {
    return this.configService.get<string>('PORTO_CLIENT_ID') ?? '';
  }
  get portoClientSecret(): string {
    return this.configService.get<string>('PORTO_CLIENT_SECRET') ?? '';
  }
  /**
   * O teto é curto de propósito: a aprovação espera esta chamada, e a analista
   * está olhando para um diálogo aberto. Melhor pedir para tentar de novo do
   * que segurar a tela.
   */
  get portoApiTimeoutMs(): number {
    return Number(this.configService.get('PORTO_API_TIMEOUT_MS') ?? 10000);
  }
}

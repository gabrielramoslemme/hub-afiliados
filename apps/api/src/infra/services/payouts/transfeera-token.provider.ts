import { Logger } from '@nestjs/common';
import { Clock } from '@Domain/shared/clock';
import {
  PayoutProviderAccessDeniedError,
  PayoutProviderUnavailableError,
} from '@Domain/withdrawals/withdrawals.errors';
import { AccessTokenProvider } from '../coupons/access-token-provider.interface';

export interface TransfeeraTokenConfig {
  authUrl: string;
  clientId: string;
  clientSecret: string;
  userAgent: string;
  timeoutMs: number;
}

interface CachedToken {
  value: string;
  usableUntil: number;
}

/** Renovar com folga: token que vence entre o reuso e a chegada vira 401 no meio do saque. */
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

/* O que a Transfeera responde quando a credencial não serve. Não passa com o tempo. */
const CREDENTIAL_REFUSALS = new Set([400, 401, 403]);

/**
 * OAuth client credentials da Transfeera. Mesmo desenho do token da Porto —
 * em memória do processo, com uma busca em voo por vez —, mas o corpo é JSON e
 * o `User-Agent` com nome e contato é obrigatório em toda chamada dela.
 */
export class TransfeeraTokenProvider implements AccessTokenProvider {
  private readonly logger = new Logger(TransfeeraTokenProvider.name);
  private cached: CachedToken | null = null;
  private inFlight: Promise<string> | null = null;

  constructor(
    private readonly config: TransfeeraTokenConfig,
    private readonly clock: Clock,
  ) {}

  async getAccessToken(): Promise<string> {
    const now = this.clock.now().getTime();

    if (this.cached && now < this.cached.usableUntil) return this.cached.value;
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.requestToken(now);

    try {
      return await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  invalidate(): void {
    this.cached = null;
  }

  private async requestToken(now: number): Promise<string> {
    const response = await this.fetchToken();

    if (!response.ok) {
      this.logger.error(
        `Recusa do OAuth da Transfeera: ${response.status} ${await response.text().catch(() => '')}`,
      );
      if (CREDENTIAL_REFUSALS.has(response.status)) throw new PayoutProviderAccessDeniedError();
      throw new PayoutProviderUnavailableError();
    }

    const body = (await response.json().catch(() => null)) as {
      access_token?: unknown;
      expires_in?: unknown;
    } | null;

    if (typeof body?.access_token !== 'string' || typeof body.expires_in !== 'number') {
      this.logger.error(`Resposta do OAuth da Transfeera sem token (${response.status})`);
      throw new PayoutProviderUnavailableError();
    }

    this.cached = {
      value: body.access_token,
      usableUntil: now + body.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS,
    };

    return body.access_token;
  }

  private async fetchToken(): Promise<Response> {
    try {
      return await fetch(this.config.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': this.config.userAgent,
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      const cause = (error as Error)?.cause;
      const reason = cause instanceof Error ? `: ${cause.message}` : '';
      this.logger.error(`Falha ao obter o token da Transfeera${reason}`, (error as Error)?.stack);
      throw new PayoutProviderUnavailableError();
    }
  }
}

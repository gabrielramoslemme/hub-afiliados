import { Logger } from '@nestjs/common';
import {
  CouponProviderAccessDeniedError,
  CouponProviderUnavailableError,
} from '@Domain/coupons/coupons.errors';
import { Clock } from '@Domain/shared/clock';
import { AccessTokenProvider } from './access-token-provider.interface';

export interface SensediaTokenConfig {
  oauthUrl: string;
  clientId: string;
  clientSecret: string;
  timeoutMs: number;
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

interface CachedToken {
  value: string;
  /** Instante a partir do qual o token deixa de ser reaproveitado. */
  usableUntil: number;
}

/**
 * Renovar com folga, e não no vencimento: um token que expira entre a decisão
 * de reusá-lo e a chegada da requisição ao gateway vira 401 no meio de uma
 * aprovação.
 */
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

/*
  O que o OAuth responde quando a credencial não serve — cliente inválido, grant
  recusado, aplicação sem permissão. Isso não passa com o tempo; os demais
  status, 5xx e 429 incluídos, são o servidor que não atendeu agora.
*/
const CREDENTIAL_REFUSALS = new Set([400, 401, 403]);

/**
 * OAuth 2.0 client credentials no gateway Sensedia. Guarda o token em memória
 * do processo — não em banco nem em cache compartilhado: ele vale uma hora, e
 * cada instância pedir o seu custa uma chamada por hora.
 */
export class SensediaTokenProvider implements AccessTokenProvider {
  private readonly logger = new Logger(SensediaTokenProvider.name);
  private cached: CachedToken | null = null;
  /** A busca em voo, para dez chamadas simultâneas pedirem um token só. */
  private inFlight: Promise<string> | null = null;

  constructor(
    private readonly config: SensediaTokenConfig,
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
      // Sai do ar com sucesso ou com falha: guardar a promessa rejeitada faria
      // toda chamada seguinte herdar um erro que já passou.
      this.inFlight = null;
    }
  }

  invalidate(): void {
    this.cached = null;
  }

  private async requestToken(now: number): Promise<string> {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64',
    );

    const response = await this.fetchToken(credentials);

    if (!response.ok) {
      // O corpo pode nomear o motivo da recusa; ele fica no log e não na tela.
      this.logger.error(
        `Recusa do OAuth da Porto: ${response.status} ${await response.text().catch(() => '')}`,
      );
      if (CREDENTIAL_REFUSALS.has(response.status)) throw new CouponProviderAccessDeniedError();
      throw new CouponProviderUnavailableError();
    }

    const body = await this.readToken(response);

    this.cached = {
      value: body.access_token,
      usableUntil: now + body.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS,
    };

    return body.access_token;
  }

  /**
   * Um 200 sem token e validade não é token: é página de proxy ou corpo cortado
   * pelo timeout. Guardá-lo faria as chamadas da hora seguinte saírem com
   * `Bearer undefined`.
   */
  private async readToken(response: Response): Promise<AccessTokenResponse> {
    const body = (await response.json().catch(() => null)) as Partial<AccessTokenResponse> | null;

    if (typeof body?.access_token !== 'string' || typeof body.expires_in !== 'number') {
      this.logger.error(`Resposta do OAuth da Porto sem token (${response.status})`);
      throw new CouponProviderUnavailableError();
    }

    return { access_token: body.access_token, expires_in: body.expires_in };
  }

  private async fetchToken(credentials: string): Promise<Response> {
    try {
      return await fetch(this.config.oauthUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      this.logger.error(`Falha ao obter o token do OAuth da Porto`, (error as Error)?.stack);
      throw new CouponProviderUnavailableError();
    }
  }
}

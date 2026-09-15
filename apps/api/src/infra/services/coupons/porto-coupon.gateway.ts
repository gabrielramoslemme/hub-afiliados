import { Logger } from '@nestjs/common';
import { CouponStatusEnum } from '@porto/contracts';
import {
  ChangeCouponInput,
  CouponAvailability,
  CouponGateway,
  IssueCouponInput,
} from '@Domain/coupons/coupon-gateway';
import {
  CouponCodeUnavailableError,
  CouponNotFoundError,
  CouponProviderAccessDeniedError,
  CouponProviderUnavailableError,
  CouponRefusedError,
} from '@Domain/coupons/coupons.errors';
import { AccessTokenProvider } from './access-token-provider.interface';

export interface PortoCouponConfig {
  apiBaseUrl: string;
  apiBasePath: string;
  timeoutMs: number;
}

/** A resposta de disponibilidade do INT-01, no vocabulário deles. */
interface AvailabilityBody {
  disponivel: boolean;
  motivo?: string;
}

/** O cupom como o INT-01 o devolve, no vocabulário deles. */
interface CouponBody {
  status: string;
  percentualDesconto: number;
}

/** O que a consulta encontrou registrado lá — só para conferir, nunca para adotar. */
interface RegisteredCoupon {
  status: CouponStatusEnum;
  discountPercent: number;
}

/*
  Os dois valores de status que o INT-01 aceita e devolve. A tradução para
  `CouponStatusEnum` mora aqui e só aqui — é o que permite trocar o fornecedor
  sem tocar um arquivo de regra.
*/
const STATUS_TO_PROVIDER: Record<CouponStatusEnum, string> = {
  [CouponStatusEnum.ACTIVE]: 'ATIVO',
  [CouponStatusEnum.INACTIVE]: 'INATIVO',
};

const TAKEN_FALLBACK = 'Este código já está em uso.';

/**
 * O INT-01 da Porto Serviços, e o único lugar do repositório onde
 * `codigoCupom`, `percentualDesconto` e `flagCupomCumulativo` existem. O que
 * sai daqui para o resto do sistema é `CouponGateway`, em vocabulário nosso —
 * é isso que permite trocar o fornecedor sem tocar um arquivo de regra.
 */
export class PortoCouponGateway implements CouponGateway {
  private readonly logger = new Logger(PortoCouponGateway.name);

  constructor(
    private readonly config: PortoCouponConfig,
    private readonly accessTokenProvider: AccessTokenProvider,
  ) {}

  async issue(input: IssueCouponInput): Promise<void> {
    /*
      Perguntar antes de criar não repete a checagem do diálogo: é o que permite
      confirmar pela consulta um registro cuja resposta se perdeu. O código estava
      livre um instante antes.
    */
    const availability = await this.checkAvailability(input.code);

    if (!availability.available) throw new CouponCodeUnavailableError();

    let response: Response;

    try {
      response = await this.request('/v1/afiliados/cupons', {
        method: 'POST',
        body: JSON.stringify({
          codigoCupom: input.code,
          percentualDesconto: input.discountPercent,
          // No MVP o cupom nunca acumula com outra campanha — é o que o INT-01 exige.
          flagCupomCumulativo: false,
        }),
      });
    } catch (error) {
      // Credencial recusada não deixa dúvida sobre o registro: ele não entrou lá,
      // e confirmar pela consulta poderia adotar um cupom que este pedido não criou.
      if (!(error instanceof CouponProviderUnavailableError)) throw error;
      return this.confirmIssued(input, error);
    }

    if (response.ok) return;

    await this.logRefusal('registrar o cupom', response);

    // Tomado entre a pergunta e a criação: a analista precisa de outro código.
    if (response.status === 409) throw new CouponCodeUnavailableError();
    // Payload recusado: dizer "código em uso" a mandaria trocar o que não é o problema.
    if (response.status === 400) throw new CouponRefusedError();
    // Um 5xx não diz se o cupom nasceu lá antes de a falha acontecer.
    if (response.status >= 500) {
      return this.confirmIssued(input, new CouponProviderUnavailableError());
    }

    throw new CouponProviderUnavailableError();
  }

  async change(input: ChangeCouponInput): Promise<void> {
    /*
      Só o que foi pedido entra no corpo: mandar `percentualDesconto` junto numa
      desativação reafirmaria um valor que ninguém pediu para mudar, e o INT-01
      trata campo ausente como "não mexe".
    */
    const body: Record<string, unknown> = {};
    if (input.discountPercent !== undefined) body.percentualDesconto = input.discountPercent;
    if (input.status !== undefined) body.status = STATUS_TO_PROVIDER[input.status];

    const path = `/v1/afiliados/cupons/${encodeURIComponent(input.code)}`;
    const response = await this.request(path, { method: 'PUT', body: JSON.stringify(body) });

    if (response.ok) {
      const registered = (await response.json().catch(() => null)) as CouponBody | null;
      if (registered) this.warnOnMismatch(input, registered);
      return;
    }

    await this.logRefusal('alterar o cupom', response);

    // O cupom existe aqui e não existe lá: repetir não resolve o desencontro.
    if (response.status === 404) throw new CouponNotFoundError();
    // Percentual ou status que eles recusam — a analista precisa mudar o pedido.
    if (response.status === 400) throw new CouponRefusedError();

    throw new CouponProviderUnavailableError();
  }

  async checkAvailability(code: string): Promise<CouponAvailability> {
    const path = `/v1/afiliados/cupons/disponibilidade?codigoCupom=${encodeURIComponent(code)}`;
    const response = await this.request(path, { method: 'GET' });

    if (!response.ok) {
      await this.logRefusal('consultar a disponibilidade do cupom', response);
      // `codigoCupom inválido`: o código que eles não aceitam, e repetir não muda isso.
      if (response.status === 400) throw new CouponRefusedError();
      throw new CouponProviderUnavailableError();
    }

    const body = (await response.json().catch(() => null)) as Partial<AvailabilityBody> | null;

    /*
      Sem a flag, qualquer leitura seria palpite — e "ocupado" travaria no diálogo
      um código livre. Um 200 assim é página de proxy ou corpo cortado: falha de
      quem respondeu, que a analista contorna tentando de novo, e não um 500.
    */
    if (typeof body?.disponivel !== 'boolean') {
      this.logger.error(`A Porto respondeu a disponibilidade fora do INT-01 (${response.status})`);
      throw new CouponProviderUnavailableError();
    }

    if (body.disponivel) return { available: true, reason: null };

    return { available: false, reason: body.motivo ?? TAKEN_FALLBACK };
  }

  /**
   * O registro ficou sem resposta — timeout, rede ou 5xx —, e isso não diz se o
   * cupom entrou lá. A consulta decide: encontrado ativo e com o percentual
   * pedido, ele é deste pedido, porque o código estava livre na pergunta que
   * antecedeu o registro. Qualquer outra coisa devolve a falha original, e a
   * analista tenta de novo.
   */
  private async confirmIssued(input: IssueCouponInput, failure: unknown): Promise<void> {
    const found = await this.find(input.code).catch(() => null);

    if (
      found?.status === CouponStatusEnum.ACTIVE &&
      found.discountPercent === input.discountPercent
    ) {
      this.logger.warn(
        `A resposta do registro de ${input.code} se perdeu; a consulta confirmou o cupom`,
      );
      return;
    }

    throw failure;
  }

  /** O cupom como está registrado lá, ou nulo quando eles não o conhecem. */
  private async find(code: string): Promise<RegisteredCoupon | null> {
    const response = await this.request(`/v1/afiliados/cupons/${encodeURIComponent(code)}`, {
      method: 'GET',
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      await this.logRefusal('consultar o cupom', response);
      throw new CouponProviderUnavailableError();
    }

    const body = (await response.json()) as CouponBody;

    return { discountPercent: body.percentualDesconto, status: this.toCouponStatus(body.status) };
  }

  /**
   * O cupom é nosso, e a resposta da Porto não sobrescreve nada aqui. Se ela
   * devolver outra coisa que não o que foi pedido, é desencontro de integração:
   * fica no log para alguém olhar, sem virar valor adotado.
   */
  private warnOnMismatch(input: ChangeCouponInput, registered: CouponBody): void {
    const statusDiffers =
      input.status !== undefined && input.status !== this.toCouponStatus(registered.status);
    const discountDiffers =
      input.discountPercent !== undefined &&
      input.discountPercent !== registered.percentualDesconto;

    if (statusDiffers || discountDiffers) {
      this.logger.warn(
        `A Porto registrou ${input.code} diferente do pedido: ${registered.status} com ${registered.percentualDesconto}%`,
      );
    }
  }

  /**
   * Uma repetição, e só em 401: o token pode ter sido revogado dentro da
   * validade, e transformar isso em falha de aprovação seria pedir à analista
   * que resolvesse um problema de credencial. O 401 que volta mesmo com o token
   * novo, e o 403, são a credencial recusada de fato: nenhuma repetição muda
   * isso, e quem resolve é quem configura o ambiente. Qualquer outro status volta
   * como veio — repetir um 409 ou um 500 não muda a resposta.
   */
  private async request(path: string, init: RequestInit): Promise<Response> {
    let response = await this.send(path, init);

    if (response.status === 401) {
      this.accessTokenProvider.invalidate();
      response = await this.send(path, init);
    }

    if (response.status === 401 || response.status === 403) {
      await this.logRefusal(`o acesso a ${path}`, response);
      throw new CouponProviderAccessDeniedError();
    }

    return response;
  }

  private async send(path: string, init: RequestInit): Promise<Response> {
    const accessToken = await this.accessTokenProvider.getAccessToken();

    try {
      return await fetch(`${this.config.apiBaseUrl}${this.config.apiBasePath}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      this.logger.error(`Falha ao chamar ${path} na Porto`, (error as Error)?.stack);
      throw new CouponProviderUnavailableError();
    }
  }

  /**
   * Qualquer coisa fora de `INATIVO` é lida como ativo: o cupom que a Porto não
   * declarou desligado continua valendo no checkout, e presumir o contrário
   * apagaria da tela um desconto que está de pé.
   */
  private toCouponStatus(status: string): CouponStatusEnum {
    return status === STATUS_TO_PROVIDER[CouponStatusEnum.INACTIVE]
      ? CouponStatusEnum.INACTIVE
      : CouponStatusEnum.ACTIVE;
  }

  /** O corpo cru pode nomear detalhe do sistema deles: fica no log, não na tela. */
  private async logRefusal(action: string, response: Response): Promise<void> {
    const body = await response.text().catch(() => '');
    this.logger.error(`A Porto recusou ${action}: ${response.status} ${body}`);
  }
}

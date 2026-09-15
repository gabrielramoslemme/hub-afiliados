import { Logger } from '@nestjs/common';
import { CouponStatusEnum } from '@porto/contracts';
import {
  CouponCodeUnavailableError,
  CouponNotFoundError,
  CouponProviderAccessDeniedError,
  CouponProviderUnavailableError,
  CouponRefusedError,
} from '@Domain/coupons/coupons.errors';
import { AccessTokenProvider } from './access-token-provider.interface';
import { PortoCouponGateway } from './porto-coupon.gateway';

const API_BASE_URL = 'https://portoapicloud-hml.portoseguro.com.br';
const API_BASE_PATH = '/porto-assistencia/campanhasneo';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type Reply = () => Response | Promise<Response>;

const available: Reply = () => json({ codigoCupom: 'MARINA25', disponivel: true }, 200);
const created: Reply = () => new Response(null, { status: 201 });
const notFound: Reply = () => json({ mensagem: 'Cupom não encontrado' }, 404);
const unauthorized: Reply = () => new Response('', { status: 401 });
const timeout: Reply = () => {
  throw new DOMException('The operation was aborted', 'TimeoutError');
};

function existing(overrides: Record<string, unknown> = {}): Reply {
  return () =>
    json(
      {
        codigoCupom: 'MARINA25',
        status: 'ATIVO',
        percentualDesconto: 10,
        flagCupomCumulativo: false,
        ...overrides,
      },
      200,
    );
}

/** Uma resposta por chamada, e a última se repete. */
function inOrder(...replies: Reply[]): Reply {
  let call = 0;

  return () => {
    const reply = replies[Math.min(call, replies.length - 1)];
    call += 1;
    return reply();
  };
}

describe('PortoCouponGateway', () => {
  let fetchMock: jest.Mock;
  let accessTokenProvider: jest.Mocked<AccessTokenProvider>;
  let gateway: PortoCouponGateway;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    accessTokenProvider = {
      getAccessToken: jest.fn().mockResolvedValue('the-access-token'),
      invalidate: jest.fn(),
    };
    gateway = new PortoCouponGateway(
      { apiBaseUrl: API_BASE_URL, apiBasePath: API_BASE_PATH, timeoutMs: 10_000 },
      accessTokenProvider,
    );
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('issue', () => {
    const input = { code: 'MARINA25', discountPercent: 10 };

    /*
      A emissão conversa com três rotas do INT-01. O dublê responde por rota, e
      não pela ordem das chamadas, para cada teste dizer só o que muda.
    */
    function provider(replies: { availability?: Reply; create?: Reply; lookup?: Reply } = {}) {
      fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
        const path = url.slice(`${API_BASE_URL}${API_BASE_PATH}`.length);

        if (path.startsWith('/v1/afiliados/cupons/disponibilidade')) {
          return (replies.availability ?? available)();
        }
        if (init.method === 'POST') return (replies.create ?? created)();
        if (init.method === 'GET') return (replies.lookup ?? notFound)();

        throw new Error(`Rota não dublada: ${init.method} ${path}`);
      });
    }

    function creations() {
      return fetchMock.mock.calls.filter(([, init]) => init.method === 'POST');
    }

    it('registers the coupon when the provider accepts it', async () => {
      provider();

      await expect(gateway.issue(input)).resolves.toBeUndefined();
    });

    /* A tradução do nosso vocabulário para o deles mora aqui, e só aqui. */
    it('posts the payload in the vocabulary the provider documents', async () => {
      provider();

      await gateway.issue(input);

      const [url, init] = creations()[0];
      expect(url).toBe(`${API_BASE_URL}${API_BASE_PATH}/v1/afiliados/cupons`);
      expect(JSON.parse(init.body)).toEqual({
        codigoCupom: 'MARINA25',
        percentualDesconto: 10,
        flagCupomCumulativo: false,
      });
    });

    it('sends the access token as a bearer credential', async () => {
      provider();

      await gateway.issue(input);

      expect(creations()[0][1].headers.Authorization).toBe('Bearer the-access-token');
    });

    /*
      Perguntar antes de criar é o que dá sentido à consulta depois de uma
      resposta perdida: se o código estava livre um instante antes, o cupom que
      aparecer lá com o mesmo percentual foi este pedido que criou.
    */
    it('refuses a code the provider already has without trying to create it', async () => {
      provider({
        availability: () =>
          json({ codigoCupom: 'MARINA25', disponivel: false, motivo: 'Cupom já existe' }, 200),
      });

      await expect(gateway.issue(input)).rejects.toThrow(CouponCodeUnavailableError);
      expect(creations()).toHaveLength(0);
    });

    it('reports a code taken between the check and the creation as unavailable', async () => {
      provider({ create: () => json({ mensagem: 'Cupom já existe' }, 409) });

      await expect(gateway.issue(input)).rejects.toThrow(CouponCodeUnavailableError);
    });

    /* Dizer "código em uso" num 400 mandaria a analista trocar o que não é o problema. */
    it('reports a payload the provider refuses as a refusal, not as a taken code', async () => {
      provider({ create: () => json({ mensagem: 'Payload inválido' }, 400) });

      await expect(gateway.issue(input)).rejects.toThrow(CouponRefusedError);
    });

    it('reports an outage when the creation gets no answer and the coupon is not there', async () => {
      provider({ create: timeout, lookup: notFound });

      await expect(gateway.issue(input)).rejects.toThrow(CouponProviderUnavailableError);
    });

    /*
      A Porto pode criar o cupom e a resposta se perder no caminho. Sem esta
      consulta, a nova tentativa da analista ouviria "código em uso" do próprio
      cupom, e ele ficaria valendo no checkout sem dono do lado de cá.
    */
    it('confirms the coupon through a lookup when the creation answer is lost', async () => {
      provider({ create: timeout, lookup: existing() });

      await expect(gateway.issue(input)).resolves.toBeUndefined();
    });

    it('confirms the coupon through a lookup after a server side failure', async () => {
      provider({ create: () => new Response('', { status: 502 }), lookup: existing() });

      await expect(gateway.issue(input)).resolves.toBeUndefined();
    });

    it('looks the coupon up by its code', async () => {
      provider({ create: timeout, lookup: existing() });

      await gateway.issue(input);

      expect(fetchMock.mock.calls.map(([url]) => url)).toContain(
        `${API_BASE_URL}${API_BASE_PATH}/v1/afiliados/cupons/MARINA25`,
      );
    });

    it('does not take as its own a coupon found with another discount', async () => {
      provider({ create: timeout, lookup: existing({ percentualDesconto: 15 }) });

      await expect(gateway.issue(input)).rejects.toThrow(CouponProviderUnavailableError);
    });

    it('does not take as its own a coupon found inactive', async () => {
      provider({ create: timeout, lookup: existing({ status: 'INATIVO' }) });

      await expect(gateway.issue(input)).rejects.toThrow(CouponProviderUnavailableError);
    });

    it('reports an outage when the lookup gets no answer either', async () => {
      provider({ create: timeout, lookup: timeout });

      await expect(gateway.issue(input)).rejects.toThrow(CouponProviderUnavailableError);
    });

    /*
      Token revogado no meio da validade é 401. Descartar o que está guardado e
      repetir uma vez evita transformar isso em falha de aprovação.
    */
    it('discards the cached token and retries once on an unauthorized response', async () => {
      provider({ create: inOrder(unauthorized, created) });

      await expect(gateway.issue(input)).resolves.toBeUndefined();
      expect(accessTokenProvider.invalidate).toHaveBeenCalledTimes(1);
    });

    it('reports denied access after a second unauthorized response', async () => {
      provider({ create: unauthorized });

      await expect(gateway.issue(input)).rejects.toThrow(CouponProviderAccessDeniedError);
      expect(creations()).toHaveLength(2);
    });

    /*
      Credencial sem permissão não é queda: tentar de novo não resolve, e a
      consulta que confirma uma resposta perdida seria só mais uma chamada
      recusada — ou, pior, adotaria um cupom que este pedido não criou.
    */
    it('reports a forbidden creation as denied access without looking the coupon up', async () => {
      provider({ create: () => new Response('', { status: 403 }), lookup: existing() });

      await expect(gateway.issue(input)).rejects.toThrow(CouponProviderAccessDeniedError);
    });
  });

  describe('checkAvailability', () => {
    it('reports a free code as available', async () => {
      fetchMock.mockResolvedValue(json({ codigoCupom: 'MARINA25', disponivel: true }, 200));

      await expect(gateway.checkAvailability('MARINA25')).resolves.toEqual({
        available: true,
        reason: null,
      });
    });

    it('carries the reason the provider gave for a taken code', async () => {
      fetchMock.mockResolvedValue(
        json({ codigoCupom: 'MARINA25', disponivel: false, motivo: 'Cupom já existe' }, 200),
      );

      await expect(gateway.checkAvailability('MARINA25')).resolves.toEqual({
        available: false,
        reason: 'Cupom já existe',
      });
    });

    it('falls back to our own wording when the provider gives no reason', async () => {
      fetchMock.mockResolvedValue(json({ codigoCupom: 'MARINA25', disponivel: false }, 200));

      await expect(gateway.checkAvailability('MARINA25')).resolves.toEqual({
        available: false,
        reason: 'Este código já está em uso.',
      });
    });

    it('asks with the code in the query string, url encoded', async () => {
      fetchMock.mockResolvedValue(json({ codigoCupom: 'MARINA25', disponivel: true }, 200));

      await gateway.checkAvailability('MARINA25');

      expect(fetchMock.mock.calls[0][0]).toBe(
        `${API_BASE_URL}${API_BASE_PATH}/v1/afiliados/cupons/disponibilidade?codigoCupom=MARINA25`,
      );
    });

    /* Um 400 aqui é o código que a Porto não aceita — pedir nova tentativa não resolveria. */
    it('reports a code the provider refuses to check as a refusal', async () => {
      fetchMock.mockResolvedValue(json({ mensagem: 'codigoCupom inválido' }, 400));

      await expect(gateway.checkAvailability('MARINA25')).rejects.toThrow(CouponRefusedError);
    });

    it('reports an outage when the provider does not answer', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(gateway.checkAvailability('MARINA25')).rejects.toThrow(
        CouponProviderUnavailableError,
      );
    });

    it('reports denied access when the gateway forbids the call', async () => {
      fetchMock.mockResolvedValue(new Response('', { status: 403 }));

      await expect(gateway.checkAvailability('MARINA25')).rejects.toThrow(
        CouponProviderAccessDeniedError,
      );
    });

    /* Uma página de erro de proxy com 200 não é resposta do INT-01, e não pode virar 500. */
    it('reports an outage when the answer is not json', async () => {
      fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 200 }));

      await expect(gateway.checkAvailability('MARINA25')).rejects.toThrow(
        CouponProviderUnavailableError,
      );
    });

    /* Sem a flag, "indisponível" seria um palpite — e travaria o código livre no diálogo. */
    it('reports an outage when the answer does not say whether the code is free', async () => {
      fetchMock.mockResolvedValue(json({ codigoCupom: 'MARINA25' }, 200));

      await expect(gateway.checkAvailability('MARINA25')).rejects.toThrow(
        CouponProviderUnavailableError,
      );
    });
  });

  describe('change', () => {
    const changed = {
      codigoCupom: 'MARINA25',
      status: 'INATIVO',
      percentualDesconto: 10,
      flagCupomCumulativo: false,
    };

    it('resolves once the provider accepts the change', async () => {
      fetchMock.mockResolvedValue(json(changed, 200));

      await expect(
        gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE }),
      ).resolves.toBeUndefined();
    });

    /*
      Quem manda no cupom é a nossa aplicação: o que a Porto devolve não
      sobrescreve nada aqui. Resposta diferente do pedido é desencontro de
      integração, e fica no log para alguém olhar.
    */
    it('warns when the provider answers a coupon different from what was asked', async () => {
      fetchMock.mockResolvedValue(json(changed, 200));

      await gateway.change({ code: 'MARINA25', discountPercent: 15 });

      expect(warn).toHaveBeenCalled();
    });

    it('stays quiet when the provider answers what was asked', async () => {
      fetchMock.mockResolvedValue(json(changed, 200));

      await gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE });

      expect(warn).not.toHaveBeenCalled();
    });

    /* A tradução do nosso vocabulário para o deles mora aqui, e só aqui. */
    it('puts the payload in the vocabulary the provider documents', async () => {
      fetchMock.mockResolvedValue(json(changed, 200));

      await gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${API_BASE_URL}${API_BASE_PATH}/v1/afiliados/cupons/MARINA25`);
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body)).toEqual({ status: 'INATIVO' });
    });

    it('sends only the discount percent when the status was not asked to change', async () => {
      fetchMock.mockResolvedValue(
        json({ ...changed, status: 'ATIVO', percentualDesconto: 15 }, 200),
      );

      await gateway.change({ code: 'MARINA25', discountPercent: 15 });

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ percentualDesconto: 15 });
    });

    it('escapes the code it puts in the path', async () => {
      fetchMock.mockResolvedValue(json(changed, 200));

      await gateway.change({ code: 'MARINA 25', status: CouponStatusEnum.INACTIVE });

      expect(fetchMock.mock.calls[0][0]).toContain('/v1/afiliados/cupons/MARINA%2025');
    });

    it('reports a coupon the provider does not know', async () => {
      fetchMock.mockResolvedValue(json({ mensagem: 'Cupom não encontrado' }, 404));

      await expect(
        gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE }),
      ).rejects.toThrow(CouponNotFoundError);
    });

    it('reports a payload the provider refuses', async () => {
      fetchMock.mockResolvedValue(json({ mensagem: 'status inválido' }, 400));

      await expect(
        gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE }),
      ).rejects.toThrow(CouponRefusedError);
    });

    it('reports the provider as unavailable when it fails', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

      await expect(
        gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE }),
      ).rejects.toThrow(CouponProviderUnavailableError);
    });

    it('reports denied access when the gateway forbids the call', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 403 }));

      await expect(
        gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE }),
      ).rejects.toThrow(CouponProviderAccessDeniedError);
    });

    it('retries once with a fresh token when the first call is refused', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(json(changed, 200));

      await gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE });

      expect(accessTokenProvider.invalidate).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

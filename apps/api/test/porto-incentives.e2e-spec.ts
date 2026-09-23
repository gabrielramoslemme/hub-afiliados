import { createHmac } from 'node:crypto';
import request from 'supertest';
import { IncentiveErrorCodeEnum } from '@porto/contracts';
import { SALE_REPOSITORY, SaleRepository } from '../src/domain/sales/sale.repository';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { E2E_WEBHOOK_SECRET } from './e2e-env';
import { approve, MARINA, register, signInOperator } from './e2e-fixtures';

const SALE_ID = '7c4f7b20-709a-4bde-8646-2fd1a5ae6fd4';

type WireEventType = 'VENDA_REGISTRADA' | 'VENDA_CONCLUIDA' | 'VENDA_NAO_CONCLUIDA';

const STATUS_BY_TYPE: Record<WireEventType, string> = {
  VENDA_REGISTRADA: 'PENDENTE',
  VENDA_CONCLUIDA: 'LIBERADO',
  VENDA_NAO_CONCLUIDA: 'CANCELADO',
};

let eventSequence = 0;

/** O payload do PDF da Porto, com um `idEvento` novo por chamada, como eles geram. */
function notification(
  tipoEvento: WireEventType,
  cupom: string,
  overrides: Record<string, unknown> = {},
) {
  eventSequence += 1;
  return {
    idEvento: `8d4a9d5f-4f17-4ad8-bec7-${String(eventSequence).padStart(12, '0')}`,
    dataHoraEvento: '2026-09-11T12:17:08.319Z',
    evento: { tipoEvento, descricaoEvento: 'Venda realizada com seu cupom' },
    incentivo: { status: STATUS_BY_TYPE[tipoEvento] },
    venda: { id: SALE_ID, cupom, valorVenda: 310.99, item: 'PFAZ * VENTILADOR' },
    ...overrides,
  };
}

function signatureOf(timestamp: string, body: string, secret = E2E_WEBHOOK_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

describe('Porto incentives webhook (e2e)', () => {
  let e2e: E2eApp;
  let coupon: string;

  /** Assina os bytes exatos que envia — é o que a Porto terá de fazer. */
  function send(payload: object, sign: (timestamp: string, body: string) => string = signatureOf) {
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));

    return request(e2e.app.getHttpServer())
      .post('/v1/webhooks/porto/incentives')
      .set('Content-Type', 'application/json')
      .set('X-Timestamp', timestamp)
      .set('X-Signature', sign(timestamp, body))
      .send(body);
  }

  async function sales() {
    return e2e.dataSource.query(
      `SELECT s.incentive_status, s.amount_cents, s.item, s.settled_at, c.code
         FROM affiliate_sales s JOIN affiliate_coupons c ON c.id = s.coupon_id`,
    );
  }

  async function events() {
    return e2e.dataSource.query(
      `SELECT event_id, external_sale_id, event_type, outcome, rejection_code, sale_id, payload
         FROM porto_incentive_events ORDER BY id`,
    );
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    const token = await signInOperator(e2e.app, e2e.dataSource);
    coupon = await approve(e2e.app, token, await register(e2e.app, MARINA));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('carries a sale from registered to released, with the trail of both calls', async () => {
    const registered = await send(notification('VENDA_REGISTRADA', coupon)).expect(200);
    const released = await send(notification('VENDA_CONCLUIDA', coupon)).expect(200);

    expect(registered.body).toEqual({ status: 'PROCESSED', saleId: expect.any(String) });
    expect(released.body).toEqual({ status: 'PROCESSED', saleId: registered.body.saleId });
    expect(await sales()).toEqual([
      {
        incentive_status: 'RELEASED',
        amount_cents: 31099,
        item: 'PFAZ * VENTILADOR',
        settled_at: new Date('2026-09-11T12:17:08.319Z'),
        code: coupon,
      },
    ]);
    expect((await events()).map((event: { outcome: string }) => event.outcome)).toEqual([
      'APPLIED',
      'APPLIED',
    ]);
  });

  it('answers a repeated registration with 200 and keeps a single sale', async () => {
    await send(notification('VENDA_REGISTRADA', coupon)).expect(200);

    const repeated = await send(notification('VENDA_REGISTRADA', coupon)).expect(200);

    expect(repeated.body.status).toBe('ALREADY_APPLIED');
    expect(await sales()).toHaveLength(1);
    expect((await events()).map((event: { outcome: string }) => event.outcome)).toEqual([
      'APPLIED',
      'DUPLICATE',
    ]);
  });

  it('finds the coupon whatever the case it arrives in', async () => {
    await send(notification('VENDA_REGISTRADA', coupon.toLowerCase())).expect(200);

    expect(await sales()).toHaveLength(1);
  });

  describe('signature', () => {
    it('refuses an unsigned call and records nothing', async () => {
      await request(e2e.app.getHttpServer())
        .post('/v1/webhooks/porto/incentives')
        .send(notification('VENDA_REGISTRADA', coupon))
        .expect(401);

      expect(await events()).toEqual([]);
    });

    it('refuses a call signed with another secret', async () => {
      await send(notification('VENDA_REGISTRADA', coupon), (timestamp, body) =>
        signatureOf(timestamp, body, 'outro-segredo-com-mais-de-32-caracteres'),
      ).expect(401);

      expect(await sales()).toEqual([]);
    });

    /* O HMAC cobre os bytes recebidos, não o JSON que o Nest remonta. */
    it('refuses a body changed after it was signed', async () => {
      const signed = JSON.stringify(notification('VENDA_REGISTRADA', coupon));

      await send(notification('VENDA_REGISTRADA', coupon), (timestamp) =>
        signatureOf(timestamp, signed),
      ).expect(401);
    });
  });

  describe('body', () => {
    /* A Porto acrescentar um campo não pode derrubar a integração. */
    it('accepts a field it does not know, and keeps it in the trail', async () => {
      await send(notification('VENDA_REGISTRADA', coupon, { canal: 'APP' })).expect(200);

      const [event] = await events();
      expect(event.payload).toMatchObject({ canal: 'APP' });
    });

    it('refuses a sale without a coupon, naming the field', async () => {
      const payload = notification('VENDA_REGISTRADA', coupon);

      const response = await send({ ...payload, venda: { ...payload.venda, cupom: '' } }).expect(
        400,
      );

      expect(response.body.code).toBe(IncentiveErrorCodeEnum.INVALID_PAYLOAD);
      expect(response.body.message).toEqual(['venda.cupom é obrigatório']);
    });

    /*
      A Porto não reenvia sozinha: o corpo recusado só volta por reprocessamento
      manual, e é na trilha que o suporte procura pelo idEvento ou pela venda.
    */
    it('records a refused body with the ids it carried', async () => {
      const payload = notification('VENDA_REGISTRADA', coupon);
      const invalid = { ...payload, venda: { ...payload.venda, cupom: '' } };

      await send(invalid).expect(400);

      expect(await events()).toEqual([
        {
          event_id: payload.idEvento,
          external_sale_id: SALE_ID,
          event_type: null,
          outcome: 'REJECTED',
          rejection_code: IncentiveErrorCodeEnum.INVALID_PAYLOAD,
          sale_id: null,
          payload: invalid,
        },
      ]);
    });

    it('records a refused body even when it carries no usable id', async () => {
      await send({ idEvento: 42, venda: 'nada' }).expect(400);

      expect(await events()).toEqual([
        expect.objectContaining({
          event_id: null,
          external_sale_id: null,
          rejection_code: IncentiveErrorCodeEnum.INVALID_PAYLOAD,
          payload: { idEvento: 42, venda: 'nada' },
        }),
      ]);
    });

    /* Recusar sobra de float perderia a venda; o valor vira centavos arredondado. */
    it('accepts a value with float noise and keeps it in cents', async () => {
      const payload = notification('VENDA_REGISTRADA', coupon);

      await send({ ...payload, venda: { ...payload.venda, valorVenda: 0.1 + 0.2 } }).expect(200);

      expect(await sales()).toEqual([expect.objectContaining({ amount_cents: 30 })]);
    });

    it('refuses an event type Porto does not send', async () => {
      await send(
        notification('VENDA_REGISTRADA', coupon, {
          evento: { tipoEvento: 'VENDA_ESTORNADA' },
        }),
      ).expect(400);
    });
  });

  describe('refusals', () => {
    it('answers an unknown coupon with INC-001 and records the refusal', async () => {
      const response = await send(notification('VENDA_REGISTRADA', 'NINGUEM99')).expect(404);

      expect(response.body.code).toBe(IncentiveErrorCodeEnum.UNKNOWN_COUPON);
      expect(await events()).toEqual([
        expect.objectContaining({
          outcome: 'REJECTED',
          rejection_code: 'INC-001',
          sale_id: null,
        }),
      ]);
    });

    it('answers a settlement of an unregistered sale with INC-002', async () => {
      const response = await send(notification('VENDA_CONCLUIDA', coupon)).expect(409);

      expect(response.body.code).toBe(IncentiveErrorCodeEnum.SALE_NOT_REGISTERED);
      expect(await sales()).toEqual([]);
    });

    it('answers a mismatched type and status with INC-004', async () => {
      const response = await send(
        notification('VENDA_CONCLUIDA', coupon, { incentivo: { status: 'CANCELADO' } }),
      ).expect(400);

      expect(response.body.code).toBe(IncentiveErrorCodeEnum.INCONSISTENT_EVENT);
    });
  });

  describe('concurrency', () => {
    /* A leitura do use case não vê a venda; é o índice único que decide. */
    it('keeps one sale when a registration loses the race to another', async () => {
      await send(notification('VENDA_REGISTRADA', coupon)).expect(200);
      jest
        .spyOn(e2e.app.get<SaleRepository>(SALE_REPOSITORY), 'findByExternalId')
        .mockResolvedValueOnce(null);

      const response = await send(notification('VENDA_REGISTRADA', coupon)).expect(200);

      expect(response.body.status).toBe('ALREADY_APPLIED');
      expect(await sales()).toHaveLength(1);
    });

    /* A checagem do use case viu pendente; é o lock que vê o cancelamento. */
    it('refuses completion when a cancellation settled the sale first', async () => {
      await send(notification('VENDA_REGISTRADA', coupon)).expect(200);
      const repository = e2e.app.get<SaleRepository>(SALE_REPOSITORY);
      const pending = await repository.findByExternalId(SALE_ID);
      await send(notification('VENDA_NAO_CONCLUIDA', coupon)).expect(200);
      jest.spyOn(repository, 'findByExternalId').mockResolvedValueOnce(pending);

      const response = await send(notification('VENDA_CONCLUIDA', coupon)).expect(409);

      expect(response.body.code).toBe(IncentiveErrorCodeEnum.SALE_ALREADY_SETTLED);
      expect(await sales()).toEqual([expect.objectContaining({ incentive_status: 'CANCELED' })]);
    });
  });
});

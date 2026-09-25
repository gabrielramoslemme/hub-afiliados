import { createHmac } from 'node:crypto';
import request from 'supertest';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { E2E_WEBHOOK_SECRET } from './e2e-env';
import { approve, CLEIDE, MARINA, register, signInOperator } from './e2e-fixtures';

type WireEventType = 'VENDA_REGISTRADA' | 'VENDA_CONCLUIDA' | 'VENDA_NAO_CONCLUIDA';

const STATUS_BY_TYPE: Record<WireEventType, string> = {
  VENDA_REGISTRADA: 'PENDENTE',
  VENDA_CONCLUIDA: 'LIBERADO',
  VENDA_NAO_CONCLUIDA: 'CANCELADO',
};

let eventSequence = 0;

/**
 * A planilha soma só a venda concluída — a que a Porto liberou. As vendas
 * chegam pelo webhook assinado, o caminho de produção, e não por INSERT.
 */
describe('Admin affiliates report (e2e)', () => {
  let e2e: E2eApp;
  let token: string;

  function api() {
    return request(e2e.app.getHttpServer());
  }

  function notify(tipoEvento: WireEventType, cupom: string, saleId: string, valorVenda: number) {
    eventSequence += 1;
    const body = JSON.stringify({
      idEvento: `5b1f2c3d-4e5f-4a6b-8c7d-${String(eventSequence).padStart(12, '0')}`,
      dataHoraEvento: '2026-09-11T12:17:08.319Z',
      evento: { tipoEvento, descricaoEvento: 'Venda realizada com seu cupom' },
      incentivo: { status: STATUS_BY_TYPE[tipoEvento], valor: 12.5 },
      venda: {
        id: saleId,
        cupom,
        valorVenda,
        item: 'GUINCHO 24H',
        dataVenda: '2026-09-08T15:40:00Z',
      },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', E2E_WEBHOOK_SECRET)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    return api()
      .post('/v1/webhooks/porto/incentives')
      .set('Content-Type', 'application/json')
      .set('X-Timestamp', timestamp)
      .set('X-Signature', `sha256=${signature}`)
      .send(body)
      .expect(200);
  }

  async function sale(cupom: string, saleId: string, valorVenda: number, end?: WireEventType) {
    await notify('VENDA_REGISTRADA', cupom, saleId, valorVenda);
    if (end) await notify(end, cupom, saleId, valorVenda);
  }

  function report(accessToken = token) {
    return api().get('/v1/admin/affiliates/report').set('Authorization', `Bearer ${accessToken}`);
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    token = await signInOperator(e2e.app, e2e.dataSource);
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('sums only the completed sales of each coupon, newest registration first', async () => {
    const coupon = await approve(e2e.app, token, await register(e2e.app, MARINA));
    await register(e2e.app, CLEIDE);

    await sale(coupon, 'a0000000-0000-4000-8000-000000000001', 310.99, 'VENDA_CONCLUIDA');
    await sale(coupon, 'a0000000-0000-4000-8000-000000000002', 100, 'VENDA_CONCLUIDA');
    await sale(coupon, 'a0000000-0000-4000-8000-000000000003', 999);
    await sale(coupon, 'a0000000-0000-4000-8000-000000000004', 555, 'VENDA_NAO_CONCLUIDA');

    const response = await report().expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        name: CLEIDE.fullName,
        coupon: null,
        completedSalesCount: 0,
        completedSalesCents: 0,
        releasedIncentiveCents: 0,
        paidCommissionCents: null,
      }),
      expect.objectContaining({
        name: MARINA.fullName,
        coupon: { code: coupon, discountPercent: 10, status: 'ACTIVE' },
        completedSalesCount: 2,
        completedSalesCents: 41099,
        releasedIncentiveCents: 2500,
        paidCommissionCents: null,
      }),
    ]);
  });

  // A planilha é a ferramenta de conferência: o documento sai inteiro, como no detalhe.
  it('answers the whole documents and no internal id', async () => {
    await register(e2e.app, MARINA);

    const [row] = (await report().expect(200)).body;

    expect(row).toMatchObject({
      cpf: '52998224725',
      rg: '12345678X',
      pixKey: MARINA.pixKey,
      occupation: MARINA.occupation,
    });
    expect(row).not.toHaveProperty('id');
    expect(row).not.toHaveProperty('userId');
  });
});

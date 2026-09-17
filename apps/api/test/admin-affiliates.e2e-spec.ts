import request from 'supertest';
import {
  AffiliateStatusEnum,
  CouponErrorCodeEnum,
  CouponStatusEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import {
  COUPON_GATEWAY,
  CouponGateway,
  IssueCouponInput,
} from '../src/domain/coupons/coupon-gateway';
import { FakeCouponGateway } from '../src/testing/fakes/fake-coupon.gateway';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import {
  approve,
  CLEIDE,
  lastLinkTo,
  MARINA,
  nextCouponCode,
  ROGERIO,
  register,
  signInOperator,
} from './e2e-fixtures';

/*
  O que só o e2e pega no painel: o SQL da fila, o que a resposta deixa escapar,
  a validação dos DTOs e as escritas que dependem de transação, lock e índice
  único. A regra de cada decisão — quem pode ser aprovado, a ordem entre a Porto
  e o banco — é dos testes dos use cases.
*/
describe('Admin affiliates (e2e)', () => {
  let e2e: E2eApp;
  let token: string;

  function api() {
    return request(e2e.app.getHttpServer());
  }

  function detail(publicId: string) {
    return api().get(`/v1/admin/affiliates/${publicId}`).set('Authorization', `Bearer ${token}`);
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    token = await signInOperator(e2e.app, e2e.dataSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  /*
    Sem a troca, as aprovações abaixo registrariam cupom de verdade na Porto com
    as credenciais do `.env` — e o registro nunca esquece um código.
  */
  it('issues coupons through the fake gateway, never through Porto', () => {
    expect(e2e.app.get<CouponGateway>(COUPON_GATEWAY)).toBeInstanceOf(FakeCouponGateway);
  });

  describe('GET /v1/admin/affiliates', () => {
    // A negação por omissão é do guard global: esta rota não declara `@Public()`.
    it('refuses a request without a token', async () => {
      await api().get('/v1/admin/affiliates').expect(401);
    });

    it('lists registrations without the cpf or any internal id', async () => {
      await register(e2e.app, MARINA);
      await register(e2e.app, CLEIDE);

      const response = await api()
        .get('/v1/admin/affiliates')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({ total: 2, page: 1, limit: 10 });
      for (const row of response.body.data) {
        expect(Object.keys(row).sort()).toEqual(
          ['createdAt', 'email', 'maskedCpf', 'name', 'publicId', 'status'].sort(),
        );
      }
      expect(JSON.stringify(response.body)).not.toContain('52998224725');
    });

    it.each([
      ['part of the name', 'nakam', 'Cleide Nakamura'],
      ['the email in another case', 'ROGERIO.BASTOS@EMAIL', 'Rogério Bastos'],
      ['the cpf typed with punctuation', '111.444.777-35', 'Rogério Bastos'],
    ])('finds a registration by %s', async (_label, search, name) => {
      await register(e2e.app, MARINA);
      await register(e2e.app, CLEIDE);
      await register(e2e.app, ROGERIO);

      const response = await api()
        .get('/v1/admin/affiliates')
        .query({ search })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.map((row: { name: string }) => row.name)).toEqual([name]);
    });

    it('filters by status', async () => {
      await register(e2e.app, MARINA);
      await approve(e2e.app, token, await register(e2e.app, CLEIDE));

      const response = await api()
        .get('/v1/admin/affiliates')
        .query({ status: AffiliateStatusEnum.PENDING_APPROVAL })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data[0].name).toBe('Marina Ferraz');
    });

    /*
      A ordenação é por coluna da tabela de usuários, e a paginação com join é
      a armadilha conhecida do TypeORM: a página vem cortada antes do join, e o
      total deixa de bater com a página.
    */
    it('sorts by name and pages through the queue keeping the total', async () => {
      await register(e2e.app, ROGERIO);
      await register(e2e.app, MARINA);
      await register(e2e.app, CLEIDE);

      const response = await api()
        .get('/v1/admin/affiliates')
        .query({ sortBy: 'name', sortOrder: 'asc', page: 2, limit: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({ total: 3, page: 2, limit: 1 });
      expect(response.body.data.map((row: { name: string }) => row.name)).toEqual([
        'Marina Ferraz',
      ]);
    });

    it('refuses to sort by a column outside the allowed list', async () => {
      await api()
        .get('/v1/admin/affiliates')
        .query({ sortBy: 'cpf' })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('GET /v1/admin/affiliates/:publicId', () => {
    it('answers the whole cpf on the detail, and no internal id', async () => {
      const publicId = await register(e2e.app, MARINA);

      const response = await detail(publicId).expect(200);

      expect(response.body).toMatchObject({
        publicId,
        name: 'Marina Ferraz',
        cpf: '52998224725',
        maskedCpf: '***.***.247-25',
        rg: '12345678X',
        socialNetwork: SocialNetworkEnum.INSTAGRAM,
        socialHandle: 'marina.ferraz',
        status: AffiliateStatusEnum.PENDING_APPROVAL,
        coupon: null,
      });
      expect(response.body).not.toHaveProperty('id');
      expect(response.body).not.toHaveProperty('userId');
    });

    it('answers 404 for an affiliate that does not exist', async () => {
      await detail('00000000-0000-4000-8000-000000000000').expect(404);
    });

    // Sem o `ParseUUIDPipe`, o Postgres recusaria o valor e a resposta seria 500.
    it('answers 400 for an id that is not a uuid', async () => {
      await detail('nope').expect(400);
    });
  });

  describe('POST /v1/admin/affiliates/:publicId/approve', () => {
    function approval(publicId: string) {
      return api()
        .post(`/v1/admin/affiliates/${publicId}/approve`)
        .set('Authorization', `Bearer ${token}`);
    }

    it('approves, issues the coupon in capitals and writes both trails with the operator', async () => {
      const publicId = await register(e2e.app, MARINA);

      await approval(publicId)
        .send({ couponCode: 'marina25', couponDiscountPercent: 15 })
        .expect(204);

      const approved = await detail(publicId).expect(200);
      expect(approved.body).toMatchObject({
        status: AffiliateStatusEnum.APPROVED,
        approvedByName: 'Analista Porto',
        approvedAt: expect.any(String),
        coupon: { code: 'MARINA25', discountPercent: 15, status: CouponStatusEnum.ACTIVE },
      });

      const trail = await api()
        .get(`/v1/admin/affiliates/${publicId}/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(trail.body).toEqual([
        expect.objectContaining({
          fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
          toStatus: AffiliateStatusEnum.APPROVED,
          actorName: 'Analista Porto',
        }),
        expect.objectContaining({
          fromStatus: null,
          toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        }),
      ]);

      const couponTrail = await api()
        .get(`/v1/admin/affiliates/${publicId}/coupon/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(couponTrail.body).toEqual([
        expect.objectContaining({
          fromStatus: null,
          toStatus: CouponStatusEnum.ACTIVE,
          toDiscountPercent: 15,
          actorName: 'Analista Porto',
        }),
      ]);
    });

    it('mails the approval with the coupon and the link to create the password', async () => {
      const publicId = await register(e2e.app, MARINA);
      const couponCode = await approve(e2e.app, token, publicId);

      expect(e2e.mail.sentTo(MARINA.email).at(-1)?.text).toContain(couponCode);
      expect(lastLinkTo(e2e.mail, MARINA.email).pathname).toBe('/definir-senha');
    });

    it('refuses an approval without a coupon', async () => {
      const publicId = await register(e2e.app, MARINA);

      await approval(publicId).send({}).expect(400);
    });

    it('refuses a discount above the ceiling the provider accepts', async () => {
      const publicId = await register(e2e.app, MARINA);

      await approval(publicId)
        .send({ couponCode: nextCouponCode(), couponDiscountPercent: 30 })
        .expect(400);
    });

    /*
      Duas analistas no mesmo cadastro, ao mesmo tempo. O dublê segura as duas
      emissões até ambas chegarem lá, para a corrida acontecer sempre, e não só
      quando o agendador quiser.
    */
    it('lets only one of two simultaneous approvals through and withdraws the other coupon', async () => {
      const publicId = await register(e2e.app, MARINA);
      const gateway = e2e.app.get<CouponGateway>(COUPON_GATEWAY);
      const issue = gateway.issue.bind(gateway);
      const change = jest.spyOn(gateway, 'change');
      const bothArrived = holdUntilBothArrive(gateway, issue);

      const bodies = [
        { couponCode: nextCouponCode(), couponDiscountPercent: 10 },
        { couponCode: nextCouponCode(), couponDiscountPercent: 10 },
      ];
      const responses = await Promise.all(bodies.map((body) => approval(publicId).send(body)));
      await bothArrived;

      expect(responses.map((response) => response.status).sort()).toEqual([204, 409]);
      expect(await e2e.dataSource.query('SELECT code FROM affiliate_coupons')).toHaveLength(1);

      const loser = bodies[responses.findIndex((response) => response.status === 409)];
      expect(change).toHaveBeenCalledWith({
        code: loser.couponCode,
        status: CouponStatusEnum.INACTIVE,
      });
    });

    /*
      Dois cadastros aprovados com o mesmo código, ao mesmo tempo: os dois passam
      pela checagem do use case, e é o índice único que decide. A escrita de quem
      perde volta inteira — status, trilha e cupom —, e o cupom que ficou valendo
      na Porto é do vencedor, então ninguém o desativa.
    */
    it('lets the unique index decide two approvals racing for the same code', async () => {
      const marina = await register(e2e.app, MARINA);
      const rogerio = await register(e2e.app, ROGERIO);
      const gateway = e2e.app.get<CouponGateway>(COUPON_GATEWAY);
      // A Porto aceita as duas: é a nossa tabela que tem de recusar a segunda.
      const bothArrived = holdUntilBothArrive(gateway, async () => undefined);
      const change = jest.spyOn(gateway, 'change');

      const body = { couponCode: nextCouponCode(), couponDiscountPercent: 10 };
      const responses = await Promise.all([
        approval(marina).send(body),
        approval(rogerio).send(body),
      ]);
      await bothArrived;

      expect(responses.map((response) => response.status).sort()).toEqual([204, 409]);
      const lost = responses.find((response) => response.status === 409);
      expect(lost?.body.code).toBe(CouponErrorCodeEnum.CODE_UNAVAILABLE);

      const loser = responses[0].status === 409 ? marina : rogerio;
      expect((await detail(loser).expect(200)).body).toMatchObject({
        status: AffiliateStatusEnum.PENDING_APPROVAL,
        approvedAt: null,
        coupon: null,
      });
      const trail = await api()
        .get(`/v1/admin/affiliates/${loser}/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(trail.body).toHaveLength(1);
      expect(change).not.toHaveBeenCalled();
    });
  });

  describe('POST /v1/admin/affiliates/:publicId/reject', () => {
    const reason = 'CPF divergente do titular da chave PIX';

    it('rejects, records the reason and mails it', async () => {
      const publicId = await register(e2e.app, MARINA);

      await api()
        .post(`/v1/admin/affiliates/${publicId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason })
        .expect(204);

      expect((await detail(publicId).expect(200)).body).toMatchObject({
        status: AffiliateStatusEnum.REJECTED,
        rejectionReason: reason,
      });
      expect(e2e.mail.sentTo(MARINA.email).at(-1)?.text).toContain(reason);
    });

    it('refuses a reason that is too short', async () => {
      const publicId = await register(e2e.app, MARINA);

      const response = await api()
        .post(`/v1/admin/affiliates/${publicId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'curto' })
        .expect(400);

      expect(response.body.message).toEqual(['Descreva o motivo com ao menos 10 caracteres']);
    });
  });

  describe('PATCH /v1/admin/affiliates/:publicId/coupon', () => {
    function change(publicId: string) {
      return api()
        .patch(`/v1/admin/affiliates/${publicId}/coupon`)
        .set('Authorization', `Bearer ${token}`);
    }

    it('deactivates the coupon and answers it as it ended up', async () => {
      const publicId = await register(e2e.app, MARINA);
      const code = await approve(e2e.app, token, publicId);

      const response = await change(publicId)
        .send({ status: CouponStatusEnum.INACTIVE })
        .expect(200);

      expect(response.body).toEqual({
        code,
        discountPercent: 10,
        status: CouponStatusEnum.INACTIVE,
      });
    });

    it('writes every change to the coupon trail, newest first, with who did it', async () => {
      const publicId = await register(e2e.app, MARINA);
      await approve(e2e.app, token, publicId);

      await change(publicId).send({ status: CouponStatusEnum.INACTIVE }).expect(200);
      await change(publicId).send({ discountPercent: 15 }).expect(200);

      const trail = await api()
        .get(`/v1/admin/affiliates/${publicId}/coupon/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(trail.body).toMatchObject([
        { fromDiscountPercent: 10, toDiscountPercent: 15, actorName: 'Analista Porto' },
        {
          fromStatus: CouponStatusEnum.ACTIVE,
          toStatus: CouponStatusEnum.INACTIVE,
          actorName: 'Analista Porto',
        },
        { fromStatus: null, toStatus: CouponStatusEnum.ACTIVE },
      ]);
    });

    it('refuses a discount above the ceiling the provider accepts', async () => {
      const publicId = await register(e2e.app, MARINA);
      await approve(e2e.app, token, publicId);

      await change(publicId).send({ discountPercent: 30 }).expect(400);
    });
  });
});

/**
 * Segura as duas próximas emissões até ambas chegarem ao gateway, e só então
 * solta: é o que garante que as duas requisições passaram pela checagem do use
 * case antes de qualquer uma escrever. Resolve quando as duas chegaram.
 */
function holdUntilBothArrive(
  gateway: CouponGateway,
  issue: (input: IssueCouponInput) => Promise<void>,
): Promise<void> {
  let arrived = 0;
  let release: () => void = () => undefined;
  const bothArrived = new Promise<void>((resolve) => {
    release = resolve;
  });

  async function held(input: IssueCouponInput): Promise<void> {
    arrived += 1;
    if (arrived === 2) release();
    await bothArrived;
    return issue(input);
  }

  jest.spyOn(gateway, 'issue').mockImplementationOnce(held).mockImplementationOnce(held);

  return bothArrived;
}

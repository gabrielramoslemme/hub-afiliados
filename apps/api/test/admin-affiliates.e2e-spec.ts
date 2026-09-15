import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AffiliateStatusEnum,
  CouponErrorCodeEnum,
  CouponStatusEnum,
  MailTemplateEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { AppModule } from '../src/app.module';
import {
  AFFILIATE_REPOSITORY,
  AffiliateRepository,
} from '../src/domain/affiliates/affiliate.repository';
import {
  COUPON_GATEWAY,
  CouponGateway,
  IssueCouponInput,
} from '../src/domain/coupons/coupon-gateway';
import { CouponProviderUnavailableError } from '../src/domain/coupons/coupons.errors';
import { MAILER } from '../src/domain/notifications/mailer';
import { HttpExceptionFilter } from '../src/infra/shared/filters/http-exception.filter';
import { mailerMock } from '../src/testing/mocks/services/mailer.mock';

describe('Admin affiliates (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let affiliates: AffiliateRepository;
  let mailer: ReturnType<typeof mailerMock>;
  let token: string;

  const operator = { email: 'analista@porto.example', password: 'MudarAgora!2026' };

  async function signIn(): Promise<string> {
    const hash = await bcrypt.hash(operator.password, 10);
    await dataSource.query(
      `INSERT INTO users (name, email, password, password_set_at, should_change_password, type, role)
       VALUES ($1, $2, $3, now(), false, 'ADMIN', 'PORTO_ANALYST')`,
      ['Analista Porto', operator.email, hash],
    );

    const response = await request(app.getHttpServer())
      .post('/v1/admin/auth/login')
      .send(operator)
      .expect(200);

    return response.body.accessToken;
  }

  async function seedQueue(): Promise<{ pending: string; approved: string }> {
    const marina = await affiliates.createWithUser({
      fullName: 'Marina Ferraz',
      email: 'marina.ferraz@email.com',
      cpf: '52998224725',
      rg: '12345678X',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'marina.ferraz@email.com',
      socialNetwork: SocialNetworkEnum.INSTAGRAM,
      socialHandle: 'marina.ferraz',
      termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
    });
    const cleide = await affiliates.createWithUser({
      fullName: 'Cleide Nakamura',
      email: 'cleide.nakamura@email.com',
      cpf: '39053344705',
      rg: '98765432',
      pixKeyType: PixKeyTypeEnum.CPF,
      pixKey: '39053344705',
      socialNetwork: null,
      socialHandle: null,
      termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
    });
    await affiliates.changeStatus({
      affiliateId: cleide.id,
      expectedStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      toStatus: AffiliateStatusEnum.APPROVED,
    });

    return { pending: marina.publicId, approved: cleide.publicId };
  }

  beforeAll(async () => {
    mailer = mailerMock();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);
    affiliates = app.get<AffiliateRepository>(AFFILIATE_REPOSITORY);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await dataSource.query(
      'TRUNCATE affiliate_coupon_history, affiliate_coupons, affiliate_status_history, password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
    );
    token = await signIn();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('GET /v1/admin/affiliates', () => {
    // A negação por omissão é do guard global: esta rota não declara `@Public()`.
    it('refuses a request without a token', async () => {
      await request(app.getHttpServer()).get('/v1/admin/affiliates').expect(401);
    });

    it('refuses a token it did not issue', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/affiliates')
        .set('Authorization', 'Bearer forjado.demais.mesmo')
        .expect(401);
    });

    it('answers the queue with the cpf masked', async () => {
      await seedQueue();

      const response = await request(app.getHttpServer())
        .get('/v1/admin/affiliates')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({ total: 2, page: 1, limit: 10 });
      expect(response.body.data[0].maskedCpf).toMatch(/^\*\*\*\.\*\*\*\./);
      expect(JSON.stringify(response.body)).not.toContain('52998224725');
    });

    it('filters by status', async () => {
      await seedQueue();

      const response = await request(app.getHttpServer())
        .get('/v1/admin/affiliates?status=PENDING_APPROVAL')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data[0].name).toBe('Marina Ferraz');
    });

    it('searches by name', async () => {
      await seedQueue();

      const response = await request(app.getHttpServer())
        .get('/v1/admin/affiliates?search=nakam')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toBe('cleide.nakamura@email.com');
    });

    it('refuses a page size above the cap', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/affiliates?limit=500')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('refuses an unknown sort column', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/affiliates?sortBy=cpf')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('GET /v1/admin/affiliates/:publicId', () => {
    it('answers the whole cpf on the detail', async () => {
      const { pending } = await seedQueue();

      const response = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${pending}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        publicId: pending,
        name: 'Marina Ferraz',
        cpf: '52998224725',
        maskedCpf: '***.***.247-25',
        rg: '12345678X',
        socialNetwork: SocialNetworkEnum.INSTAGRAM,
        socialHandle: 'marina.ferraz',
        status: AffiliateStatusEnum.PENDING_APPROVAL,
        approvedByName: null,
      });
    });

    it('answers 404 for an affiliate that does not exist', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/affiliates/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('answers 400 for an id that is not a uuid', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/affiliates/nope')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('GET /v1/admin/affiliates/:publicId/history', () => {
    it('answers the trail newest first', async () => {
      const { approved } = await seedQueue();

      const response = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${approved}/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual([
        expect.objectContaining({
          fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
          toStatus: AffiliateStatusEnum.APPROVED,
        }),
        expect.objectContaining({
          fromStatus: null,
          toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
          actorName: null,
        }),
      ]);
    });
  });

  let issuedCoupons = 0;

  /*
    Aprovar passou a exigir o cupom, registrado na Porto no mesmo passo. Cada
    chamada estreia um código porque o emissor — o falso como o real — nunca
    esquece o que já emitiu, e o `TRUNCATE` do `beforeEach` não alcança a memória
    dele. Teste que precisa do mesmo código duas vezes guarda o retorno.
  */
  function coupon(overrides: Record<string, unknown> = {}) {
    issuedCoupons += 1;

    return { couponCode: `CUPOM${issuedCoupons}`, couponDiscountPercent: 10, ...overrides };
  }

  describe('POST /v1/admin/affiliates/:publicId/approve', () => {
    it('approves and records who decided', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(coupon())
        .expect(204);

      const detail = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${pending}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(detail.body).toMatchObject({
        status: AffiliateStatusEnum.APPROVED,
        approvedByName: 'Analista Porto',
        approvedAt: expect.any(String),
      });
    });

    it('writes the transition to the trail with the operator that decided', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(coupon())
        .expect(204);

      const history = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${pending}/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(history.body[0]).toMatchObject({
        fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
        toStatus: AffiliateStatusEnum.APPROVED,
        actorName: 'Analista Porto',
      });
    });

    it('stores a set-password token for the approved affiliate', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(coupon())
        .expect(204);

      const rows = await dataSource.query(
        `SELECT purpose, token_hash, used_at FROM password_reset_tokens`,
      );

      expect(rows).toEqual([
        { purpose: 'SET_PASSWORD', token_hash: expect.any(String), used_at: null },
      ]);
      expect(rows[0].token_hash).toHaveLength(64);
    });

    it('sends the approval email with the link', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(coupon())
        .expect(204);

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          template: MailTemplateEnum.REGISTRATION_APPROVED,
          to: 'marina.ferraz@email.com',
          variables: expect.objectContaining({ link: expect.stringContaining('/definir-senha') }),
        }),
      );
    });

    it('refuses a second decision on the same registration', async () => {
      const { approved } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${approved}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(coupon())
        .expect(409);
    });

    it('answers 404 for an affiliate that does not exist', async () => {
      await request(app.getHttpServer())
        .post('/v1/admin/affiliates/00000000-0000-4000-8000-000000000000/approve')
        .set('Authorization', `Bearer ${token}`)
        .send(coupon())
        .expect(404);
    });

    it('refuses a request without a token', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .send(coupon())
        .expect(401);
    });

    it('issues the coupon and answers it in the detail', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(coupon({ couponCode: 'marina25', couponDiscountPercent: 15 }))
        .expect(204);

      const detail = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${pending}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // O código é gravado em maiúsculas, e não como foi digitado.
      expect(detail.body.coupon).toEqual({
        code: 'MARINA25',
        discountPercent: 15,
        status: CouponStatusEnum.ACTIVE,
      });
    });

    it('sends the approval email carrying the issued coupon', async () => {
      const { pending } = await seedQueue();
      const issued = coupon();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(issued)
        .expect(204);

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            coupon: issued.couponCode,
            discountPercent: '10',
          }),
        }),
      );
    });

    it('refuses to approve without a coupon', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('refuses a discount above the ceiling the provider accepts', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(coupon({ couponDiscountPercent: 30 }))
        .expect(400);
    });

    it('refuses a coupon code already issued to another affiliate', async () => {
      const { pending } = await seedQueue();
      const other = await affiliates.createWithUser({
        fullName: 'Rui Barbosa',
        email: 'rui.barbosa@email.com',
        cpf: '15350946056',
        rg: '11223344',
        pixKeyType: PixKeyTypeEnum.CPF,
        pixKey: '15350946056',
        socialNetwork: null,
        socialHandle: null,
        termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
      });

      // O mesmo código nas duas chamadas: é o conflito que o teste persegue.
      const taken = coupon();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${other.publicId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(taken)
        .expect(204);

      const conflict = await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(taken)
        .expect(409);

      expect(conflict.body.code).toBe(CouponErrorCodeEnum.CODE_UNAVAILABLE);
    });

    /*
      A ordem é a promessa do fluxo: se o cupom não sai, nada é gravado. Aqui o
      emissor recusa o código, e o cadastro tem que continuar em análise.
    */
    it('leaves the registration pending when the coupon cannot be issued', async () => {
      const { pending } = await seedQueue();
      jest
        .spyOn(app.get<CouponGateway>(COUPON_GATEWAY), 'issue')
        .mockRejectedValueOnce(new CouponProviderUnavailableError());

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send(coupon())
        .expect(503);

      const detail = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${pending}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(detail.body).toMatchObject({
        status: AffiliateStatusEnum.PENDING_APPROVAL,
        coupon: null,
      });
      expect(mailer.send).not.toHaveBeenCalled();
    });

    /*
      Duas analistas no mesmo cadastro, ao mesmo tempo. O dublê segura as duas
      emissões até ambas chegarem lá, para a corrida acontecer sempre, e não só
      quando o agendador quiser.
    */
    it('lets only one of two simultaneous approvals through and withdraws the other coupon', async () => {
      const { pending } = await seedQueue();
      const gateway = app.get<CouponGateway>(COUPON_GATEWAY);
      const issue = gateway.issue.bind(gateway);
      const change = jest.spyOn(gateway, 'change');

      let arrived = 0;
      let releaseBoth: () => void = () => undefined;
      const bothArrived = new Promise<void>((resolve) => {
        releaseBoth = resolve;
      });

      async function heldIssue(input: IssueCouponInput) {
        arrived += 1;
        if (arrived === 2) releaseBoth();
        await bothArrived;
        return issue(input);
      }

      jest
        .spyOn(gateway, 'issue')
        .mockImplementationOnce(heldIssue)
        .mockImplementationOnce(heldIssue);

      const bodies = [coupon(), coupon()];
      const responses = await Promise.all(
        bodies.map((body) =>
          request(app.getHttpServer())
            .post(`/v1/admin/affiliates/${pending}/approve`)
            .set('Authorization', `Bearer ${token}`)
            .send(body),
        ),
      );

      expect(responses.map((response) => response.status).sort()).toEqual([204, 409]);

      const rows = await dataSource.query('SELECT code FROM affiliate_coupons');
      expect(rows).toHaveLength(1);

      const loser = bodies[responses.findIndex((response) => response.status === 409)];
      expect(change).toHaveBeenCalledWith({
        code: loser.couponCode,
        status: CouponStatusEnum.INACTIVE,
      });
    });
  });

  describe('POST /v1/admin/affiliates/:publicId/reject', () => {
    const reason = 'CPF divergente do titular da chave PIX';

    it('rejects and records the reason', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason })
        .expect(204);

      const detail = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${pending}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(detail.body).toMatchObject({
        status: AffiliateStatusEnum.REJECTED,
        rejectionReason: reason,
      });
    });

    it('sends the rejection email carrying the reason', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason })
        .expect(204);

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          template: MailTemplateEnum.REGISTRATION_REJECTED,
          variables: expect.objectContaining({ reason }),
        }),
      );
    });

    it('refuses a reason that is too short', async () => {
      const { pending } = await seedQueue();

      const response = await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'curto' })
        .expect(400);

      expect(response.body.message).toEqual(['Descreva o motivo com ao menos 10 caracteres']);
    });

    it('refuses a rejection without a reason', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('refuses a registration that was already decided', async () => {
      const { approved } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${approved}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason })
        .expect(409);
    });

    it('does not create a set-password token for a rejected registration', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason })
        .expect(204);

      const rows = await dataSource.query('SELECT count(*) FROM password_reset_tokens');

      expect(rows[0].count).toBe('0');
    });
  });
  /** Aprova um cadastro pelo caminho de produção e devolve o código do cupom criado. */
  async function approvedWithCoupon(): Promise<{ publicId: string; code: string }> {
    const { pending } = await seedQueue();
    const issued = coupon();

    await request(app.getHttpServer())
      .post(`/v1/admin/affiliates/${pending}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send(issued)
      .expect(204);

    return { publicId: pending, code: issued.couponCode };
  }

  describe('PATCH /v1/admin/affiliates/:publicId/coupon', () => {
    it('deactivates the coupon and answers it as it ended up', async () => {
      const { publicId, code } = await approvedWithCoupon();

      const response = await request(app.getHttpServer())
        .patch(`/v1/admin/affiliates/${publicId}/coupon`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: CouponStatusEnum.INACTIVE })
        .expect(200);

      expect(response.body).toEqual({
        code,
        discountPercent: 10,
        status: CouponStatusEnum.INACTIVE,
      });
    });

    it('shows the new discount in the detail', async () => {
      const { publicId } = await approvedWithCoupon();

      await request(app.getHttpServer())
        .patch(`/v1/admin/affiliates/${publicId}/coupon`)
        .set('Authorization', `Bearer ${token}`)
        .send({ discountPercent: 15 })
        .expect(200);

      const detail = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${publicId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(detail.body.coupon).toMatchObject({
        discountPercent: 15,
        status: CouponStatusEnum.ACTIVE,
      });
    });

    it('refuses a change that carries nothing', async () => {
      const { publicId } = await approvedWithCoupon();

      await request(app.getHttpServer())
        .patch(`/v1/admin/affiliates/${publicId}/coupon`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('refuses a discount above the ceiling the provider accepts', async () => {
      const { publicId } = await approvedWithCoupon();

      await request(app.getHttpServer())
        .patch(`/v1/admin/affiliates/${publicId}/coupon`)
        .set('Authorization', `Bearer ${token}`)
        .send({ discountPercent: 30 })
        .expect(400);
    });

    it('reports a registration that has no coupon yet', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .patch(`/v1/admin/affiliates/${pending}/coupon`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: CouponStatusEnum.INACTIVE })
        .expect(404);
    });

    it('refuses a request without a token', async () => {
      const { publicId } = await approvedWithCoupon();

      await request(app.getHttpServer())
        .patch(`/v1/admin/affiliates/${publicId}/coupon`)
        .send({ status: CouponStatusEnum.INACTIVE })
        .expect(401);
    });
  });

  describe('GET /v1/admin/affiliates/:publicId/coupon/history', () => {
    it('lists the issue and every change, newest first, with who did them', async () => {
      const { publicId } = await approvedWithCoupon();

      await request(app.getHttpServer())
        .patch(`/v1/admin/affiliates/${publicId}/coupon`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: CouponStatusEnum.INACTIVE })
        .expect(200);

      const history = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${publicId}/coupon/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(history.body).toMatchObject([
        {
          fromStatus: CouponStatusEnum.ACTIVE,
          toStatus: CouponStatusEnum.INACTIVE,
          fromDiscountPercent: 10,
          toDiscountPercent: 10,
          actorName: 'Analista Porto',
        },
        {
          fromStatus: null,
          toStatus: CouponStatusEnum.ACTIVE,
          fromDiscountPercent: null,
          toDiscountPercent: 10,
          actorName: 'Analista Porto',
        },
      ]);
    });

    it('answers an empty trail before the approval', async () => {
      const { pending } = await seedQueue();

      const history = await request(app.getHttpServer())
        .get(`/v1/admin/affiliates/${pending}/coupon/history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(history.body).toEqual([]);
    });
  });
});

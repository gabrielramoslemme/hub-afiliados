import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AffiliateStatusEnum, MailTemplateEnum, PixKeyTypeEnum } from '@porto/contracts';
import { AppModule } from '../src/app.module';
import {
  AFFILIATE_REPOSITORY,
  AffiliateRepository,
} from '../src/domain/affiliates/affiliate.repository';
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
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'marina.ferraz@email.com',
    });
    const cleide = await affiliates.createWithUser({
      fullName: 'Cleide Nakamura',
      email: 'cleide.nakamura@email.com',
      cpf: '39053344705',
      pixKeyType: PixKeyTypeEnum.CPF,
      pixKey: '39053344705',
    });
    await affiliates.changeStatus({
      affiliateId: cleide.id,
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
      'TRUNCATE affiliate_status_history, password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
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

  describe('POST /v1/admin/affiliates/:publicId/approve', () => {
    it('approves and records who decided', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .set('Authorization', `Bearer ${token}`)
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
        .expect(409);
    });

    it('answers 404 for an affiliate that does not exist', async () => {
      await request(app.getHttpServer())
        .post('/v1/admin/affiliates/00000000-0000-4000-8000-000000000000/approve')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('refuses a request without a token', async () => {
      const { pending } = await seedQueue();

      await request(app.getHttpServer())
        .post(`/v1/admin/affiliates/${pending}/approve`)
        .expect(401);
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
});

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthAudienceEnum, PixKeyTypeEnum } from '@porto/contracts';
import {
  AFFILIATE_REPOSITORY,
  AffiliateRepository,
} from '../src/domain/affiliates/affiliate.repository';
import { ACCESS_TOKEN_ISSUER, AccessTokenIssuer } from '../src/domain/auth/access-token';
import { HttpExceptionFilter } from '../src/infra/shared/filters/http-exception.filter';
import { createE2eTestingModule } from './create-e2e-testing-module';

describe('Admin coupons (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let affiliates: AffiliateRepository;
  let accessTokenIssuer: AccessTokenIssuer;
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

  /** Grava um cupom pelo caminho de produção: a aprovação é quem o emite. */
  async function issueCoupon(code: string): Promise<void> {
    const affiliate = await affiliates.createWithUser({
      fullName: 'Marina Ferraz',
      email: 'marina.ferraz@email.com',
      cpf: '52998224725',
      rg: '12345678X',
      pixKeyType: PixKeyTypeEnum.EMAIL,
      pixKey: 'marina.ferraz@email.com',
      socialNetwork: null,
      socialHandle: null,
      termsAcceptedAt: new Date('2026-08-17T12:00:00Z'),
    });

    await request(app.getHttpServer())
      .post(`/v1/admin/affiliates/${affiliate.publicId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ couponCode: code, couponDiscountPercent: 10 })
      .expect(204);
  }

  beforeAll(async () => {
    const moduleRef = await createE2eTestingModule().compile();
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
    accessTokenIssuer = app.get<AccessTokenIssuer>(ACCESS_TOKEN_ISSUER);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE affiliate_coupon_history, affiliate_coupons, affiliate_status_history, password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
    );
    token = await signIn();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('GET /v1/admin/coupons/availability', () => {
    it('reports a code nobody holds as available', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/coupons/availability')
        .query({ code: 'MARINA25' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ code: 'MARINA25', available: true, reason: null });
    });

    it('answers with the normalized code, not the one that was typed', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/admin/coupons/availability')
        .query({ code: 'marina25' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.code).toBe('MARINA25');
    });

    /*
      Código próprio, e não o `MARINA25` dos outros testes: o emissor não esquece
      o que emitiu, e o `TRUNCATE` do `beforeEach` não alcança a memória dele —
      queimar aqui um código que outro teste espera livre deixaria a suíte
      dependente da ordem.
    */
    it('reports a code already issued as unavailable', async () => {
      await issueCoupon('CLEIDE10');

      const response = await request(app.getHttpServer())
        .get('/v1/admin/coupons/availability')
        .query({ code: 'CLEIDE10' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({ available: false, reason: expect.any(String) });
    });

    it('refuses a code shorter than the format allows', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/coupons/availability')
        .query({ code: 'MAR' })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    // A negação por omissão é do guard global: esta rota não declara `@Public()`.
    it('refuses a request without a token', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/coupons/availability')
        .query({ code: 'MARINA25' })
        .expect(401);
    });

    it('refuses a token of the affiliate channel', async () => {
      const affiliateToken = await accessTokenIssuer.issue({
        sub: '00000000-0000-4000-8000-000000000000',
        aud: AuthAudienceEnum.AFFILIATE,
        role: null,
        name: 'Marina Ferraz',
      });

      await request(app.getHttpServer())
        .get('/v1/admin/coupons/availability')
        .query({ code: 'MARINA25' })
        .set('Authorization', `Bearer ${affiliateToken}`)
        .expect(403);
    });
  });
});

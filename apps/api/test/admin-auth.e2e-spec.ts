import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthErrorCodeEnum } from '@porto/contracts';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/infra/shared/filters/http-exception.filter';

describe('Admin authentication (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const credentials = { email: 'analista@porto.example', password: 'MudarAgora!2026' };

  async function insertOperator(overrides: { isActive?: boolean; password?: string | null } = {}) {
    const hash =
      overrides.password === null
        ? null
        : await bcrypt.hash(overrides.password ?? 'MudarAgora!2026', 10);

    await dataSource.query(
      `INSERT INTO users (name, email, password, password_set_at, should_change_password, is_active, type, role)
       VALUES ($1, $2, $3, now(), false, $4, 'ADMIN', 'PORTO_ANALYST')`,
      ['Analista Porto', credentials.email, hash, overrides.isActive ?? true],
    );
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE affiliate_status_history, password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('POST /v1/admin/auth/login', () => {
    it('signs an operator in', async () => {
      await insertOperator();

      const response = await request(app.getHttpServer())
        .post('/v1/admin/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        user: {
          publicId: expect.any(String),
          name: 'Analista Porto',
          email: credentials.email,
          role: 'PORTO_ANALYST',
          shouldChangePassword: false,
        },
      });
    });

    it('records the login instant', async () => {
      await insertOperator();

      await request(app.getHttpServer()).post('/v1/admin/auth/login').send(credentials).expect(200);

      const [{ last_login_at: lastLoginAt }] = await dataSource.query(
        'SELECT last_login_at FROM users WHERE email = $1',
        [credentials.email],
      );

      expect(lastLoginAt).not.toBeNull();
    });

    it('rejects a wrong password', async () => {
      await insertOperator();

      const response = await request(app.getHttpServer())
        .post('/v1/admin/auth/login')
        .send({ ...credentials, password: 'outra-senha' })
        .expect(401);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_CREDENTIALS);
    });

    it('answers the same error for an unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/admin/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_CREDENTIALS);
    });

    it('reports an inactive operator', async () => {
      await insertOperator({ isActive: false });

      const response = await request(app.getHttpServer())
        .post('/v1/admin/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.code).toBe(AuthErrorCodeEnum.ACCOUNT_INACTIVE);
    });

    it('reports an operator without a password', async () => {
      await insertOperator({ password: null });

      const response = await request(app.getHttpServer())
        .post('/v1/admin/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.code).toBe(AuthErrorCodeEnum.PASSWORD_NOT_SET);
    });

    it('rejects a request without a password', async () => {
      await request(app.getHttpServer())
        .post('/v1/admin/auth/login')
        .send({ email: credentials.email })
        .expect(400);
    });
  });
});

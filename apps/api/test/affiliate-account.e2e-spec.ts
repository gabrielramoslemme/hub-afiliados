import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AffiliateStatusEnum, AuthErrorCodeEnum, MailTemplateEnum } from '@porto/contracts';
import { AppModule } from '../src/app.module';
import { MAILER, SendMailInput } from '../src/domain/notifications/mailer';
import { HttpExceptionFilter } from '../src/infra/shared/filters/http-exception.filter';
import { mailerMock } from '../src/testing/mocks/services/mailer.mock';

/**
 * O ciclo inteiro, ponta a ponta: a pessoa se cadastra, a analista aprova, o
 * link do e-mail vira senha e a senha vira sessão. Cada passo depende do
 * anterior de propósito — é assim que a suíte pega um elo que se soltou.
 */
describe('Affiliate account (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: ReturnType<typeof mailerMock>;

  const signUp = {
    fullName: 'Marina Ferraz',
    email: 'marina.ferraz@email.com',
    cpf: '529.982.247-25',
    rg: '12.345.678-X',
    pixKeyType: 'EMAIL',
    pixKey: 'marina.ferraz@email.com',
    socialNetwork: 'INSTAGRAM',
    socialHandle: '@marina.ferraz',
  };

  const PASSWORD = 'SenhaNova!2026';

  function sentLink(): string {
    const calls = mailer.send.mock.calls as [SendMailInput][];
    const approval = calls.find(
      ([input]) => input.template === MailTemplateEnum.REGISTRATION_APPROVED,
    );

    return approval?.[0].variables.link ?? '';
  }

  async function operatorToken(): Promise<string> {
    const hash = await bcrypt.hash('MudarAgora!2026', 10);
    await dataSource.query(
      `INSERT INTO users (name, email, password, password_set_at, should_change_password, type, role)
       VALUES ($1, $2, $3, now(), false, 'ADMIN', 'PORTO_ANALYST')
       ON CONFLICT (email) DO NOTHING`,
      ['Analista Porto', 'analista@porto.example', hash],
    );

    const response = await request(app.getHttpServer())
      .post('/v1/admin/auth/login')
      .send({ email: 'analista@porto.example', password: 'MudarAgora!2026' })
      .expect(200);

    return response.body.accessToken;
  }

  /** Cadastra e aprova, devolvendo o token em claro que foi para o e-mail. */
  async function approvedAffiliate(): Promise<{ publicId: string; token: string }> {
    const created = await request(app.getHttpServer())
      .post('/v1/affiliates')
      .send(signUp)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/admin/affiliates/${created.body.publicId}/approve`)
      .set('Authorization', `Bearer ${await operatorToken()}`)
      .expect(204);

    return {
      publicId: created.body.publicId,
      token: new URL(sentLink()).searchParams.get('token') ?? '',
    };
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
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await dataSource.query(
      'TRUNCATE affiliate_status_history, password_reset_tokens, affiliates, users RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('POST /v1/affiliate/auth/set-password', () => {
    it('turns the link of the approval email into a password', async () => {
      const { token } = await approvedAffiliate();

      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token, password: PASSWORD })
        .expect(204);

      const [{ password }] = await dataSource.query('SELECT password FROM users WHERE email = $1', [
        signUp.email,
      ]);

      expect(password).toMatch(/^\$2[aby]\$10\$/);
    });

    it('burns the link: the second try fails', async () => {
      const { token } = await approvedAffiliate();

      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token, password: PASSWORD })
        .expect(204);

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token, password: 'OutraSenha!2026' })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });

    it('refuses a forged token', async () => {
      await approvedAffiliate();

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token: 'inventado', password: PASSWORD })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });

    it('refuses a password below eight characters', async () => {
      const { token } = await approvedAffiliate();

      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token, password: 'curta' })
        .expect(400);
    });
  });

  describe('POST /v1/affiliate/auth/login', () => {
    it('signs an approved affiliate in', async () => {
      const { token } = await approvedAffiliate();
      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token, password: PASSWORD })
        .expect(204);

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/login')
        .send({ email: signUp.email, password: PASSWORD })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        user: {
          publicId: expect.any(String),
          name: 'Marina Ferraz',
          email: signUp.email,
          status: AffiliateStatusEnum.APPROVED,
          coupon: null,
        },
      });
    });

    it('tells a registration still under review apart from a wrong password', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(signUp).expect(201);
      await dataSource.query('UPDATE users SET password = $1 WHERE email = $2', [
        await bcrypt.hash(PASSWORD, 10),
        signUp.email,
      ]);

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/login')
        .send({ email: signUp.email, password: PASSWORD })
        .expect(403);

      expect(response.body.code).toBe(AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW);
    });

    it('reports an affiliate that has not created a password yet', async () => {
      await approvedAffiliate();

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/login')
        .send({ email: signUp.email, password: PASSWORD })
        .expect(401);

      expect(response.body.code).toBe(AuthErrorCodeEnum.PASSWORD_NOT_SET);
    });

    it('refuses an operator on the affiliate channel', async () => {
      await operatorToken();

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/login')
        .send({ email: 'analista@porto.example', password: 'MudarAgora!2026' })
        .expect(401);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_CREDENTIALS);
    });
  });

  describe('GET /v1/affiliate/me', () => {
    async function signedInToken(): Promise<string> {
      const { token } = await approvedAffiliate();
      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token, password: PASSWORD })
        .expect(204);

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/login')
        .send({ email: signUp.email, password: PASSWORD })
        .expect(200);

      return response.body.accessToken;
    }

    it('answers the account with cpf, rg and pix key masked', async () => {
      const token = await signedInToken();

      const response = await request(app.getHttpServer())
        .get('/v1/affiliate/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Marina Ferraz',
        maskedCpf: '***.***.247-25',
        maskedRg: '*****678X',
        socialNetwork: 'INSTAGRAM',
        socialHandle: 'marina.ferraz',
        maskedPixKey: 'ma***********@email.com',
        status: AffiliateStatusEnum.APPROVED,
        coupon: null,
      });
      expect(JSON.stringify(response.body)).not.toContain('52998224725');
      expect(JSON.stringify(response.body)).not.toContain('12345678X');
    });

    it('refuses a request without a token', async () => {
      await request(app.getHttpServer()).get('/v1/affiliate/me').expect(401);
    });

    it('refuses a token of the panel', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/affiliate/me')
        .set('Authorization', `Bearer ${await operatorToken()}`)
        .expect(403);

      expect(response.body.message).toContain('afiliado');
    });
  });
});

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthErrorCodeEnum, MailTemplateEnum } from '@porto/contracts';
import { AppModule } from '../src/app.module';
import { MAILER, SendMailInput } from '../src/domain/notifications/mailer';
import { HttpExceptionFilter } from '../src/infra/shared/filters/http-exception.filter';
import { mailerMock } from '../src/testing/mocks/services/mailer.mock';

describe('Admin authentication (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: ReturnType<typeof mailerMock>;

  const credentials = { email: 'analista@porto.example', password: 'MudarAgora!2026' };
  const NEW_PASSWORD = 'SenhaNova!2026';

  /** Os e-mails de recuperação enviados até agora, do mais antigo ao mais novo. */
  function recoveryEmails(): SendMailInput[] {
    return (mailer.send.mock.calls as [SendMailInput][])
      .map(([input]) => input)
      .filter((input) => input.template === MailTemplateEnum.PASSWORD_RECOVERY);
  }

  function recoveryLink(): string {
    return recoveryEmails().at(-1)?.variables.link ?? '';
  }

  /** Pede a recuperação e devolve o token em claro que foi para o e-mail. */
  async function recoveryToken(): Promise<string> {
    await request(app.getHttpServer())
      .post('/v1/admin/auth/forgot-password')
      .send({ email: credentials.email })
      .expect(204);

    return new URL(recoveryLink()).searchParams.get('token') ?? '';
  }

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

  describe('POST /v1/admin/auth/forgot-password', () => {
    it('mails the operator a link to the panel screen', async () => {
      await insertOperator();

      await request(app.getHttpServer())
        .post('/v1/admin/auth/forgot-password')
        .send({ email: credentials.email })
        .expect(204);

      expect(recoveryLink()).toContain('/admin/redefinir-senha?token=');
    });

    /*
      O 204 é o mesmo dos três casos abaixo, e é esse o ponto: a tela não pode
      virar uma forma de descobrir quem opera o painel.
    */
    it('answers the same for an email nobody registered', async () => {
      await request(app.getHttpServer())
        .post('/v1/admin/auth/forgot-password')
        .send({ email: 'ninguem@porto.example' })
        .expect(204);

      expect(recoveryEmails()).toHaveLength(0);
    });

    it('sends nothing to an inactive operator', async () => {
      await insertOperator({ isActive: false });

      await request(app.getHttpServer())
        .post('/v1/admin/auth/forgot-password')
        .send({ email: credentials.email })
        .expect(204);

      expect(recoveryEmails()).toHaveLength(0);
    });

    it('holds a second request made right away', async () => {
      await insertOperator();

      await recoveryToken();
      await request(app.getHttpServer())
        .post('/v1/admin/auth/forgot-password')
        .send({ email: credentials.email })
        .expect(204);

      expect(recoveryEmails()).toHaveLength(1);
    });
  });

  describe('POST /v1/admin/auth/reset-password', () => {
    it('replaces the password of the operator', async () => {
      await insertOperator();
      const token = await recoveryToken();

      await request(app.getHttpServer())
        .post('/v1/admin/auth/reset-password')
        .send({ token, password: NEW_PASSWORD })
        .expect(204);

      await request(app.getHttpServer())
        .post('/v1/admin/auth/login')
        .send({ email: credentials.email, password: NEW_PASSWORD })
        .expect(200);
    });

    it('stops the old password from working', async () => {
      await insertOperator();
      const token = await recoveryToken();

      await request(app.getHttpServer())
        .post('/v1/admin/auth/reset-password')
        .send({ token, password: NEW_PASSWORD })
        .expect(204);

      await request(app.getHttpServer()).post('/v1/admin/auth/login').send(credentials).expect(401);
    });

    it('burns the link: the second try fails', async () => {
      await insertOperator();
      const token = await recoveryToken();

      await request(app.getHttpServer())
        .post('/v1/admin/auth/reset-password')
        .send({ token, password: NEW_PASSWORD })
        .expect(204);

      const response = await request(app.getHttpServer())
        .post('/v1/admin/auth/reset-password')
        .send({ token, password: 'OutraSenha!2026' })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });

    /*
      Trocar de canal com o link na mão é o que este teste fecha: o token do
      painel não vale na tela do afiliado, e a recusa é a mesma de um link
      vencido — dizer "este é do outro canal" confirmaria a conta.
    */
    it('refuses a panel link on the affiliate channel', async () => {
      await insertOperator();
      const token = await recoveryToken();

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/reset-password')
        .send({ token, password: NEW_PASSWORD })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });
  });
});

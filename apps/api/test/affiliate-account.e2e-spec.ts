import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AffiliateStatusEnum,
  AuthErrorCodeEnum,
  MailTemplateEnum,
  RegistrationErrorCodeEnum,
} from '@porto/contracts';
import { MAILER, SendMailInput } from '../src/domain/notifications/mailer';
import { HttpExceptionFilter } from '../src/infra/shared/filters/http-exception.filter';
import { mailerMock } from '../src/testing/mocks/services/mailer.mock';
import { createE2eTestingModule } from './create-e2e-testing-module';

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
    termsAccepted: true,
  };

  const PASSWORD = 'SenhaNova!2026';

  function sentLink(): string {
    const calls = mailer.send.mock.calls as [SendMailInput][];
    const approval = calls.find(
      ([input]) => input.template === MailTemplateEnum.REGISTRATION_APPROVED,
    );

    return approval?.[0].variables.link ?? '';
  }

  /** Os e-mails de recuperação enviados até agora, do mais antigo ao mais novo. */
  function recoveryEmails(): SendMailInput[] {
    return (mailer.send.mock.calls as [SendMailInput][])
      .map(([input]) => input)
      .filter((input) => input.template === MailTemplateEnum.PASSWORD_RECOVERY);
  }

  /** Pede a recuperação e devolve o token em claro que foi para o e-mail. */
  async function recoveryToken(): Promise<string> {
    await request(app.getHttpServer())
      .post('/v1/affiliate/auth/forgot-password')
      .send({ email: signUp.email })
      .expect(204);

    const link = recoveryEmails().at(-1)?.variables.link ?? '';

    return new URL(link).searchParams.get('token') ?? '';
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

  /*
    Cada aprovação estreia um código porque o emissor — o falso como o real —
    nunca esquece o que já emitiu, e o `TRUNCATE` do `beforeEach` não alcança a
    memória dele.
  */
  let issuedCoupons = 0;

  /** Cadastra e aprova, devolvendo o token em claro que foi para o e-mail. */
  async function approvedAffiliate(): Promise<{
    publicId: string;
    token: string;
    couponCode: string;
  }> {
    const created = await request(app.getHttpServer())
      .post('/v1/affiliates')
      .send(signUp)
      .expect(201);

    issuedCoupons += 1;
    const couponCode = `CUPOM${issuedCoupons}`;

    await request(app.getHttpServer())
      .post(`/v1/admin/affiliates/${created.body.publicId}/approve`)
      .set('Authorization', `Bearer ${await operatorToken()}`)
      .send({ couponCode, couponDiscountPercent: 10 })
      .expect(204);

    return {
      publicId: created.body.publicId,
      token: new URL(sentLink()).searchParams.get('token') ?? '',
      couponCode,
    };
  }

  beforeAll(async () => {
    mailer = mailerMock();
    const moduleRef = await createE2eTestingModule()
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

  describe('POST /v1/affiliate/auth/forgot-password', () => {
    it('mails the affiliate a link to the portal screen', async () => {
      await approvedAffiliate();

      const token = await recoveryToken();

      expect(token).not.toBe('');
      expect(new URL(recoveryEmails().at(-1)?.variables.link ?? '').pathname).toBe(
        '/redefinir-senha',
      );
    });

    /*
      O caminho que este fluxo abriu para quem deixou vencer o link de 48 horas
      da aprovação: antes, só escrevendo para o suporte.
    */
    it('serves an approved affiliate who never set a password', async () => {
      await approvedAffiliate();

      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/forgot-password')
        .send({ email: signUp.email })
        .expect(204);

      expect(recoveryEmails()).toHaveLength(1);
    });

    it('sends nothing while the registration is under review', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(signUp).expect(201);

      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/forgot-password')
        .send({ email: signUp.email })
        .expect(204);

      expect(recoveryEmails()).toHaveLength(0);
    });

    it('answers the same for an email nobody registered', async () => {
      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/forgot-password')
        .send({ email: 'ninguem@email.com' })
        .expect(204);

      expect(recoveryEmails()).toHaveLength(0);
    });
  });

  describe('POST /v1/affiliate/auth/reset-password', () => {
    const NEW_PASSWORD = 'OutraSenha!2026';

    it('replaces the password the affiliate had', async () => {
      const { token } = await approvedAffiliate();
      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token, password: PASSWORD })
        .expect(204);

      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/reset-password')
        .send({ token: await recoveryToken(), password: NEW_PASSWORD })
        .expect(204);

      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/login')
        .send({ email: signUp.email, password: NEW_PASSWORD })
        .expect(200);
      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/login')
        .send({ email: signUp.email, password: PASSWORD })
        .expect(401);
    });

    /*
      O link da aprovação escreve senha sem pedir a atual. Vivo depois de uma
      recuperação, ele devolveria a quem alcançasse aquele e-mail antigo o poder
      de sobrescrever a senha que acabou de nascer.
    */
    it('kills the approval link that was still outstanding', async () => {
      const { token: approvalToken } = await approvedAffiliate();

      await request(app.getHttpServer())
        .post('/v1/affiliate/auth/reset-password')
        .send({ token: await recoveryToken(), password: NEW_PASSWORD })
        .expect(204);

      const response = await request(app.getHttpServer())
        .post('/v1/affiliate/auth/set-password')
        .send({ token: approvalToken, password: 'MaisOutra!2026' })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });

    it('refuses an affiliate link on the panel channel', async () => {
      await approvedAffiliate();

      const response = await request(app.getHttpServer())
        .post('/v1/admin/auth/reset-password')
        .send({ token: await recoveryToken(), password: NEW_PASSWORD })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });
  });

  describe('POST /v1/affiliate/auth/login', () => {
    it('signs an approved affiliate in', async () => {
      const { token, couponCode } = await approvedAffiliate();
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
          coupon: couponCode,
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

  /** Aprova, cria a senha e entra, devolvendo o token da sessão do afiliado. */
  async function signedIn(): Promise<{ accessToken: string; couponCode: string }> {
    const { token, couponCode } = await approvedAffiliate();
    await request(app.getHttpServer())
      .post('/v1/affiliate/auth/set-password')
      .send({ token, password: PASSWORD })
      .expect(204);

    const response = await request(app.getHttpServer())
      .post('/v1/affiliate/auth/login')
      .send({ email: signUp.email, password: PASSWORD })
      .expect(200);

    return { accessToken: response.body.accessToken, couponCode };
  }

  describe('GET /v1/affiliate/me', () => {
    it('answers the account with cpf, rg and pix key masked', async () => {
      const { accessToken, couponCode } = await signedIn();

      const response = await request(app.getHttpServer())
        .get('/v1/affiliate/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Marina Ferraz',
        maskedCpf: '***.***.247-25',
        maskedRg: '*****678X',
        socialNetwork: 'INSTAGRAM',
        socialHandle: 'marina.ferraz',
        maskedPixKey: 'ma***********@email.com',
        status: AffiliateStatusEnum.APPROVED,
        coupon: couponCode,
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

  describe('PATCH /v1/affiliate/me/pix-key', () => {
    const newKey = { pixKeyType: 'PHONE', pixKey: '(11) 98765-4321' };

    async function storedPixKey(): Promise<{ pix_key_type: string; pix_key: string }> {
      const [row] = await dataSource.query('SELECT pix_key_type, pix_key FROM affiliates');

      return row;
    }

    it('replaces the key once the current password confirms it', async () => {
      const { accessToken } = await signedIn();

      await request(app.getHttpServer())
        .patch('/v1/affiliate/me/pix-key')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...newKey, currentPassword: PASSWORD })
        .expect(204);

      const response = await request(app.getHttpServer())
        .get('/v1/affiliate/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        pixKeyType: 'PHONE',
        maskedPixKey: '(11) *****-4321',
      });
      expect(await storedPixKey()).toEqual({ pix_key_type: 'PHONE', pix_key: '11987654321' });
    });

    it('warns the owner by email with the new key masked', async () => {
      const { accessToken } = await signedIn();

      await request(app.getHttpServer())
        .patch('/v1/affiliate/me/pix-key')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...newKey, currentPassword: PASSWORD })
        .expect(204);

      const warning = (mailer.send.mock.calls as [SendMailInput][])
        .map(([input]) => input)
        .find((input) => input.template === MailTemplateEnum.PIX_KEY_CHANGED);

      expect(warning).toMatchObject({
        to: signUp.email,
        variables: { maskedPixKey: '(11) *****-4321' },
      });
    });

    it('refuses a wrong password and keeps the key', async () => {
      const { accessToken } = await signedIn();

      const response = await request(app.getHttpServer())
        .patch('/v1/affiliate/me/pix-key')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...newKey, currentPassword: 'SenhaErrada!2026' })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.WRONG_PASSWORD);
      expect(await storedPixKey()).toEqual({ pix_key_type: 'EMAIL', pix_key: signUp.pixKey });
    });

    it('refuses a cpf key that is not the cpf of the registration', async () => {
      const { accessToken } = await signedIn();

      const response = await request(app.getHttpServer())
        .patch('/v1/affiliate/me/pix-key')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pixKeyType: 'CPF', pixKey: '111.444.777-35', currentPassword: PASSWORD })
        .expect(400);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.PIX_KEY_MISMATCH);
    });

    /* A chave é o único dado do cadastro que o afiliado altera sozinho. */
    it('refuses to change anything but the pix key', async () => {
      const { accessToken } = await signedIn();

      await request(app.getHttpServer())
        .patch('/v1/affiliate/me/pix-key')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...newKey, currentPassword: PASSWORD, cpf: '111.444.777-35' })
        .expect(400);

      expect(await storedPixKey()).toEqual({ pix_key_type: 'EMAIL', pix_key: signUp.pixKey });
    });

    it('refuses a token of the panel', async () => {
      await request(app.getHttpServer())
        .patch('/v1/affiliate/me/pix-key')
        .set('Authorization', `Bearer ${await operatorToken()}`)
        .send({ ...newKey, currentPassword: PASSWORD })
        .expect(403);
    });
  });
});

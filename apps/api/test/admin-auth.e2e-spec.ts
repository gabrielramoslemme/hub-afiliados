import request from 'supertest';
import { AuthErrorCodeEnum } from '@porto/contracts';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { insertOperator, lastLinkTo, OPERATOR, tokenOf } from './e2e-fixtures';

describe('Admin authentication (e2e)', () => {
  let e2e: E2eApp;

  const NEW_PASSWORD = 'SenhaNova!2026';

  function api() {
    return request(e2e.app.getHttpServer());
  }

  function signIn(password = OPERATOR.password) {
    return api().post('/v1/admin/auth/login').send({ email: OPERATOR.email, password });
  }

  function forgotPassword() {
    return api().post('/v1/admin/auth/forgot-password').send({ email: OPERATOR.email });
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  describe('POST /v1/admin/auth/login', () => {
    it('signs an operator in and records the instant', async () => {
      await insertOperator(e2e.dataSource);

      const response = await signIn().expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        user: {
          publicId: expect.any(String),
          name: OPERATOR.name,
          email: OPERATOR.email,
          role: 'PORTO_ANALYST',
          shouldChangePassword: false,
        },
      });
      const [{ last_login_at: lastLoginAt }] = await e2e.dataSource.query(
        'SELECT last_login_at FROM users WHERE email = $1',
        [OPERATOR.email],
      );
      expect(lastLoginAt).not.toBeNull();
    });

    it('rejects a wrong password', async () => {
      await insertOperator(e2e.dataSource);

      const response = await signIn('outra-senha').expect(401);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_CREDENTIALS);
    });

    it('rejects a request without a password', async () => {
      await api().post('/v1/admin/auth/login').send({ email: OPERATOR.email }).expect(400);
    });
  });

  describe('POST /v1/admin/auth/forgot-password', () => {
    it('mails the operator a link to the panel screen', async () => {
      await insertOperator(e2e.dataSource);

      await forgotPassword().expect(204);

      expect(lastLinkTo(e2e.mail, OPERATOR.email).pathname).toBe('/admin/redefinir-senha');
    });

    it('holds a second request made right away', async () => {
      await insertOperator(e2e.dataSource);

      await forgotPassword().expect(204);
      await forgotPassword().expect(204);

      expect(e2e.mail.sentTo(OPERATOR.email)).toHaveLength(1);
    });
  });

  describe('POST /v1/admin/auth/reset-password', () => {
    async function recoveryToken(): Promise<string> {
      await forgotPassword().expect(204);

      return tokenOf(lastLinkTo(e2e.mail, OPERATOR.email));
    }

    it('replaces the password of the operator', async () => {
      await insertOperator(e2e.dataSource);

      await api()
        .post('/v1/admin/auth/reset-password')
        .send({ token: await recoveryToken(), password: NEW_PASSWORD })
        .expect(204);

      await signIn(NEW_PASSWORD).expect(200);
      await signIn().expect(401);
    });

    /*
      Trocar de canal com o link na mão é o que este teste fecha: o token do
      painel não vale na tela do afiliado, e a recusa é a mesma de um link
      vencido — dizer "este é do outro canal" confirmaria a conta.
    */
    it('refuses a panel link on the affiliate channel', async () => {
      await insertOperator(e2e.dataSource);

      const response = await api()
        .post('/v1/affiliate/auth/reset-password')
        .send({ token: await recoveryToken(), password: NEW_PASSWORD })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });
  });
});

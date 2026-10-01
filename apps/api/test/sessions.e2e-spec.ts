import request from 'supertest';
import { UserRoleEnum } from '@porto/contracts';
import { createE2eApp, type E2eApp, mailSettled, resetDatabase } from './e2e-app';
import {
  approve,
  lastLinkTo,
  MARINA,
  OPERATOR,
  register,
  signInOperator,
  tokenOf,
} from './e2e-fixtures';

/**
 * A sessão vale enquanto a conta diz que vale, e não só enquanto o JWT não
 * vence: sair, redefinir a senha e desativar a conta encerram o token na
 * requisição seguinte.
 */
describe('Sessions (e2e)', () => {
  let e2e: E2eApp;

  const PASSWORD = 'SenhaNova!2026';

  function api() {
    return request(e2e.app.getHttpServer());
  }

  async function affiliateSession(): Promise<string> {
    const publicId = await register(e2e.app, MARINA);
    await approve(e2e.app, await signInOperator(e2e.app, e2e.dataSource), publicId);
    await api()
      .post('/v1/affiliate/auth/set-password')
      .send({ token: tokenOf(lastLinkTo(e2e.mail, MARINA.email)), password: PASSWORD })
      .expect(204);

    const response = await api()
      .post('/v1/affiliate/auth/login')
      .send({ email: MARINA.email, password: PASSWORD })
      .expect(200);

    return response.body.accessToken;
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(() => resetDatabase(e2e));

  afterAll(() => e2e.app.close());

  describe('GET /v1/admin/me', () => {
    it('answers the operator behind the token, without the internal id', async () => {
      const token = await signInOperator(e2e.app, e2e.dataSource);

      const response = await api()
        .get('/v1/admin/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        publicId: expect.any(String),
        name: OPERATOR.name,
        email: OPERATOR.email,
        role: UserRoleEnum.PORTO_ANALYST,
        shouldChangePassword: false,
      });
    });
  });

  describe('POST /v1/admin/auth/logout', () => {
    it('ends the session on the server, not only in the browser', async () => {
      const token = await signInOperator(e2e.app, e2e.dataSource);

      await api().post('/v1/admin/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);

      await api().get('/v1/admin/me').set('Authorization', `Bearer ${token}`).expect(401);
    });
  });

  describe('POST /v1/affiliate/auth/logout', () => {
    it('ends the session on the server, not only in the browser', async () => {
      const token = await affiliateSession();

      await api()
        .post('/v1/affiliate/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await api().get('/v1/affiliate/me').set('Authorization', `Bearer ${token}`).expect(401);
    });

    it('lets the person sign in again afterwards', async () => {
      const token = await affiliateSession();
      await api()
        .post('/v1/affiliate/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const again = await api()
        .post('/v1/affiliate/auth/login')
        .send({ email: MARINA.email, password: PASSWORD })
        .expect(200);

      await api()
        .get('/v1/affiliate/me')
        .set('Authorization', `Bearer ${again.body.accessToken}`)
        .expect(200);
    });
  });

  it('ends the session of an operator deactivated while signed in', async () => {
    const token = await signInOperator(e2e.app, e2e.dataSource);

    await e2e.dataSource.query('UPDATE users SET is_active = false WHERE email = $1', [
      OPERATOR.email,
    ]);

    await api().get('/v1/admin/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('ends the sessions open with the previous password when it is reset by the link', async () => {
    const token = await affiliateSession();
    await api()
      .post('/v1/affiliate/auth/forgot-password')
      .send({ email: MARINA.email })
      .expect(204);
    await mailSettled(e2e);

    await api()
      .post('/v1/affiliate/auth/reset-password')
      .send({ token: tokenOf(lastLinkTo(e2e.mail, MARINA.email)), password: 'OutraSenha!2026' })
      .expect(204);

    await api().get('/v1/affiliate/me').set('Authorization', `Bearer ${token}`).expect(401);
  });
});

import request from 'supertest';
import { RateLimitErrorCodeEnum } from '@porto/contracts';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { MARINA } from './e2e-fixtures';

/**
 * O limite por visitante, ponta a ponta: a chave é o endereço que o CloudFront
 * escreveu, a conta é por rota, e a resposta diz quando tentar de novo — é com o
 * `Retry-After` que a tela mostra a espera.
 */
describe('Throttling (e2e)', () => {
  let e2e: E2eApp;

  function signIn(viewer: string, headers: Record<string, string> = {}) {
    return request(e2e.app.getHttpServer())
      .post('/v1/affiliate/auth/login')
      .set('CloudFront-Viewer-Address', `${viewer}:51000`)
      .set(headers)
      .send({ email: 'ninguem@email.com', password: 'SenhaErrada!2026' });
  }

  async function exhaustSignIn(viewer: string) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await signIn(viewer).expect(401);
    }
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(() => resetDatabase(e2e));

  afterAll(() => e2e.app.close());

  it('refuses the eleventh sign-in of a visitor with 429, the wait and RATE-001', async () => {
    await exhaustSignIn('203.0.113.7');

    const response = await signIn('203.0.113.7').expect(429);

    expect(response.body.code).toBe(RateLimitErrorCodeEnum.TOO_MANY_REQUESTS);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(14 * 60);
  });

  it('keeps counting each visitor apart', async () => {
    await exhaustSignIn('203.0.113.7');

    await signIn('198.51.100.10').expect(401);
  });

  it('does not let a visitor escape the limit by changing X-Forwarded-For', async () => {
    await exhaustSignIn('203.0.113.7');

    await signIn('203.0.113.7', { 'X-Forwarded-For': '192.0.2.99' }).expect(429);
  });

  it('counts each route on its own, so a busy sign-in does not block the sign-up', async () => {
    await exhaustSignIn('203.0.113.7');

    await request(e2e.app.getHttpServer())
      .post('/v1/affiliates')
      .set('CloudFront-Viewer-Address', '203.0.113.7:51000')
      .send(MARINA)
      .expect(201);
  });

  it('holds the public sign-up to five per hour for a visitor', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(e2e.app.getHttpServer())
        .post('/v1/affiliates')
        .set('CloudFront-Viewer-Address', '203.0.113.7:51000')
        .send({ ...MARINA, email: `marina${attempt}@email.com` });
    }

    const response = await request(e2e.app.getHttpServer())
      .post('/v1/affiliates')
      .set('CloudFront-Viewer-Address', '203.0.113.7:51000')
      .send(MARINA)
      .expect(429);

    expect(Number(response.headers['retry-after'])).toBeGreaterThan(59 * 60);
  });
});

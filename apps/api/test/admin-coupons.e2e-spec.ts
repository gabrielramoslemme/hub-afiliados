import request from 'supertest';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { ACCESS_TOKEN_ISSUER, AccessTokenIssuer } from '../src/domain/auth/access-token';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { approve, MARINA, register, signInOperator } from './e2e-fixtures';

describe('Admin coupons (e2e)', () => {
  let e2e: E2eApp;
  let token: string;

  function availability(code: string, accessToken = token) {
    return request(e2e.app.getHttpServer())
      .get('/v1/admin/coupons/availability')
      .query({ code })
      .set('Authorization', `Bearer ${accessToken}`);
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    token = await signInOperator(e2e.app, e2e.dataSource);
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  describe('GET /v1/admin/coupons/availability', () => {
    it('reports a code nobody holds as available, normalized to capitals', async () => {
      const response = await availability('marina25').expect(200);

      expect(response.body).toEqual({ code: 'MARINA25', available: true, reason: null });
    });

    it('reports a code already issued as unavailable', async () => {
      const code = await approve(e2e.app, token, await register(e2e.app, MARINA));

      const response = await availability(code).expect(200);

      expect(response.body).toMatchObject({ available: false, reason: expect.any(String) });
    });

    it('refuses a code shorter than the format allows', async () => {
      await availability('MAR').expect(400);
    });

    it('refuses a token of the affiliate channel', async () => {
      // Uma conta de verdade: o guard global confere a sessão no banco, e um
      // `sub` inventado pararia ali, com 401, antes do guard do canal.
      await register(e2e.app, MARINA);
      const [{ public_id: sub }] = await e2e.dataSource.query(
        'SELECT public_id FROM users WHERE email = $1',
        [MARINA.email],
      );
      const affiliateToken = await e2e.app.get<AccessTokenIssuer>(ACCESS_TOKEN_ISSUER).issue({
        sub,
        aud: AuthAudienceEnum.AFFILIATE,
        role: UserRoleEnum.AFFILIATE,
        name: 'Marina Ferraz',
        ver: 0,
      });

      await availability('MARINA25', affiliateToken).expect(403);
    });
  });
});

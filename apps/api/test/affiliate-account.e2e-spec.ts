import * as bcrypt from 'bcrypt';
import request from 'supertest';
import {
  AffiliateStatusEnum,
  AuthErrorCodeEnum,
  RegistrationErrorCodeEnum,
} from '@porto/contracts';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { approve, lastLinkTo, MARINA, register, signInOperator, tokenOf } from './e2e-fixtures';

/**
 * O ciclo inteiro, ponta a ponta: a pessoa se cadastra, a analista aprova, o
 * link do e-mail vira senha e a senha vira sessão. O link é lido do e-mail
 * renderizado de verdade — é assim que a suíte pega um elo que se soltou entre o
 * use case, o template e a rota.
 */
describe('Affiliate account (e2e)', () => {
  let e2e: E2eApp;

  const PASSWORD = 'SenhaNova!2026';
  const NEW_PASSWORD = 'OutraSenha!2026';

  function api() {
    return request(e2e.app.getHttpServer());
  }

  /** Cadastra e aprova a Marina, devolvendo o token do link que foi no e-mail. */
  async function approvedAffiliate(): Promise<{ approvalToken: string; couponCode: string }> {
    const publicId = await register(e2e.app, MARINA);
    const couponCode = await approve(
      e2e.app,
      await signInOperator(e2e.app, e2e.dataSource),
      publicId,
    );

    return { approvalToken: tokenOf(lastLinkTo(e2e.mail, MARINA.email)), couponCode };
  }

  function setPassword(token: string, password = PASSWORD) {
    return api().post('/v1/affiliate/auth/set-password').send({ token, password });
  }

  function signIn(password = PASSWORD) {
    return api().post('/v1/affiliate/auth/login').send({ email: MARINA.email, password });
  }

  /** Aprova, cria a senha e entra, devolvendo o token da sessão do afiliado. */
  async function signedIn(): Promise<{ accessToken: string; couponCode: string }> {
    const { approvalToken, couponCode } = await approvedAffiliate();
    await setPassword(approvalToken).expect(204);

    return { accessToken: (await signIn().expect(200)).body.accessToken, couponCode };
  }

  /** Pede a recuperação e devolve o token em claro que foi para o e-mail. */
  async function recoveryToken(): Promise<string> {
    await api()
      .post('/v1/affiliate/auth/forgot-password')
      .send({ email: MARINA.email })
      .expect(204);

    return tokenOf(lastLinkTo(e2e.mail, MARINA.email));
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

  describe('POST /v1/affiliate/auth/set-password', () => {
    it('burns the link: the second try fails', async () => {
      const { approvalToken } = await approvedAffiliate();

      await setPassword(approvalToken).expect(204);
      const response = await setPassword(approvalToken, NEW_PASSWORD).expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });

    it('refuses a link past its expiry', async () => {
      const { approvalToken } = await approvedAffiliate();
      await e2e.dataSource.query(
        "UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute'",
      );

      const response = await setPassword(approvalToken).expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });

    it('refuses a password below eight characters', async () => {
      const { approvalToken } = await approvedAffiliate();

      await setPassword(approvalToken, 'curta').expect(400);
    });
  });

  describe('POST /v1/affiliate/auth/forgot-password', () => {
    it('mails an approved affiliate a link to the portal screen', async () => {
      await approvedAffiliate();

      await recoveryToken();

      expect(lastLinkTo(e2e.mail, MARINA.email).pathname).toBe('/redefinir-senha');
    });

    /*
      Cada pedido invalida o link do anterior, mas continua contando para o
      limite de cinco por hora: o que se limita é e-mail que saiu, não link que
      ainda serve. Filtrar os invalidados na consulta abriria a caixa de entrada
      de quem tem conta a um e-mail por minuto, sem teto.
    */
    it('keeps counting the links a newer request invalidated toward the hourly limit', async () => {
      await approvedAffiliate();

      for (let sent = 0; sent < 5; sent += 1) {
        await recoveryToken();
        // Tira o pedido de dentro do intervalo de um minuto, sem sair da hora.
        await e2e.dataSource.query(
          "UPDATE password_reset_tokens SET created_at = created_at - interval '2 minutes'",
        );
      }
      e2e.mail.clear();

      await api()
        .post('/v1/affiliate/auth/forgot-password')
        .send({ email: MARINA.email })
        .expect(204);

      expect(e2e.mail.sentTo(MARINA.email)).toHaveLength(0);
    });
  });

  describe('POST /v1/affiliate/auth/reset-password', () => {
    it('replaces the password the affiliate had', async () => {
      const { approvalToken } = await approvedAffiliate();
      await setPassword(approvalToken).expect(204);

      await api()
        .post('/v1/affiliate/auth/reset-password')
        .send({ token: await recoveryToken(), password: NEW_PASSWORD })
        .expect(204);

      await signIn(NEW_PASSWORD).expect(200);
      await signIn(PASSWORD).expect(401);
    });

    /*
      O link da aprovação escreve senha sem pedir a atual. Vivo depois de uma
      recuperação, ele devolveria a quem alcançasse aquele e-mail antigo o poder
      de sobrescrever a senha que acabou de nascer.
    */
    it('kills the approval link that was still outstanding', async () => {
      const { approvalToken } = await approvedAffiliate();

      await api()
        .post('/v1/affiliate/auth/reset-password')
        .send({ token: await recoveryToken(), password: NEW_PASSWORD })
        .expect(204);

      const response = await setPassword(approvalToken, 'MaisOutra!2026').expect(400);
      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });

    it('refuses an affiliate link on the panel channel', async () => {
      await approvedAffiliate();

      const response = await api()
        .post('/v1/admin/auth/reset-password')
        .send({ token: await recoveryToken(), password: NEW_PASSWORD })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.INVALID_TOKEN);
    });
  });

  describe('POST /v1/affiliate/auth/login', () => {
    it('signs in with the password the approval link created', async () => {
      const { approvalToken, couponCode } = await approvedAffiliate();
      await setPassword(approvalToken).expect(204);

      const response = await signIn().expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        user: {
          publicId: expect.any(String),
          name: MARINA.fullName,
          email: MARINA.email,
          status: AffiliateStatusEnum.APPROVED,
          coupon: couponCode,
        },
      });
    });

    it('tells a registration still under review apart from a wrong password', async () => {
      await register(e2e.app, MARINA);
      await e2e.dataSource.query('UPDATE users SET password = $1 WHERE email = $2', [
        await bcrypt.hash(PASSWORD, 10),
        MARINA.email,
      ]);

      const response = await signIn().expect(403);

      expect(response.body.code).toBe(AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW);
    });
  });

  describe('GET /v1/affiliate/me', () => {
    it('answers the account with cpf, rg and pix key masked, and no internal id', async () => {
      const { accessToken, couponCode } = await signedIn();

      const response = await api()
        .get('/v1/affiliate/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        name: MARINA.fullName,
        status: AffiliateStatusEnum.APPROVED,
        coupon: couponCode,
      });
      expect(response.body).not.toHaveProperty('id');
      const body = JSON.stringify(response.body);
      expect(body).not.toContain('52998224725');
      expect(body).not.toContain('12345678X');
      expect(body).not.toContain(MARINA.pixKey);
    });

    it('refuses a token of the panel', async () => {
      await api()
        .get('/v1/affiliate/me')
        .set('Authorization', `Bearer ${await signInOperator(e2e.app, e2e.dataSource)}`)
        .expect(403);
    });
  });

  describe('PATCH /v1/affiliate/me/pix-key', () => {
    const newKey = { pixKeyType: 'PHONE', pixKey: '(11) 98765-4321' };

    function changePixKey(accessToken: string) {
      return api().patch('/v1/affiliate/me/pix-key').set('Authorization', `Bearer ${accessToken}`);
    }

    async function storedPixKey(): Promise<{ pix_key_type: string; pix_key: string }> {
      const [row] = await e2e.dataSource.query('SELECT pix_key_type, pix_key FROM affiliates');

      return row;
    }

    it('replaces the key once the current password confirms it', async () => {
      const { accessToken } = await signedIn();

      await changePixKey(accessToken)
        .send({ ...newKey, currentPassword: PASSWORD })
        .expect(204);

      const response = await api()
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

      await changePixKey(accessToken)
        .send({ ...newKey, currentPassword: PASSWORD })
        .expect(204);

      expect(e2e.mail.sentTo(MARINA.email).at(-1)?.text).toContain('(11) *****-4321');
    });

    it('refuses a wrong password and keeps the key', async () => {
      const { accessToken } = await signedIn();

      const response = await changePixKey(accessToken)
        .send({ ...newKey, currentPassword: 'SenhaErrada!2026' })
        .expect(400);

      expect(response.body.code).toBe(AuthErrorCodeEnum.WRONG_PASSWORD);
      expect(await storedPixKey()).toEqual({ pix_key_type: 'EMAIL', pix_key: MARINA.pixKey });
    });

    it('refuses a cpf key that is not the cpf of the registration', async () => {
      const { accessToken } = await signedIn();

      const response = await changePixKey(accessToken)
        .send({ pixKeyType: 'CPF', pixKey: '111.444.777-35', currentPassword: PASSWORD })
        .expect(400);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.PIX_KEY_MISMATCH);
    });

    /* A chave é o único dado do cadastro que o afiliado altera sozinho. */
    it('refuses to change anything but the pix key', async () => {
      const { accessToken } = await signedIn();

      await changePixKey(accessToken)
        .send({ ...newKey, currentPassword: PASSWORD, cpf: '111.444.777-35' })
        .expect(400);

      expect(await storedPixKey()).toEqual({ pix_key_type: 'EMAIL', pix_key: MARINA.pixKey });
    });

    it('refuses a token of the panel', async () => {
      await changePixKey(await signInOperator(e2e.app, e2e.dataSource))
        .send({ ...newKey, currentPassword: PASSWORD })
        .expect(403);
    });
  });
});

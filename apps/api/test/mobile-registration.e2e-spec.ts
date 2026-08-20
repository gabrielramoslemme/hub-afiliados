import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { MailTemplateEnum } from '@porto/contracts';
import { AppModule } from '../src/app.module';
import { MAILER } from '../src/domain/notifications/mailer';
import { HttpExceptionFilter } from '../src/infra/shared/filters/http-exception.filter';
import { mailerMock } from '../src/testing/mocks/services/mailer.mock';

describe('Mobile registration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: ReturnType<typeof mailerMock>;

  const validBody = {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '529.982.247-25',
    pixKeyType: 'EMAIL',
    pixKey: 'marina@email.com',
    termsVersion: '1.0-homolog',
    termsAccepted: true,
  };

  beforeAll(async () => {
    mailer = mailerMock();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await dataSource.query(
      'TRUNCATE affiliate_status_history, password_reset_tokens, affiliates, users, terms_versions RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      `INSERT INTO terms_versions (version, content_url, published_at, is_current)
       VALUES ('1.0-homolog', 'https://example.com/termos/1.0', now(), true)`,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('GET /v1/mobile/terms/current', () => {
    it('returns the current terms without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/mobile/terms/current')
        .expect(200);

      expect(response.body).toEqual({
        version: '1.0-homolog',
        contentUrl: 'https://example.com/termos/1.0',
        publishedAt: expect.any(String),
      });
    });

    it('does not include the serial id in the body', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/mobile/terms/current')
        .expect(200);

      expect(response.body).not.toHaveProperty('id');
    });

    it('returns 404 when no terms version is published', async () => {
      await dataSource.query('DELETE FROM terms_versions');

      const response = await request(app.getHttpServer())
        .get('/v1/mobile/terms/current')
        .expect(404);

      expect(response.body.code).toBe('TERMS_NOT_PUBLISHED');
    });
  });

  describe('POST /v1/mobile/affiliates', () => {
    it('registers an affiliate pending approval', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send(validBody)
        .expect(201);

      expect(response.body).toEqual({
        publicId: expect.any(String),
        status: 'PENDING_APPROVAL',
      });
    });

    it('does not create a password for the pre-registration', async () => {
      await request(app.getHttpServer()).post('/v1/mobile/affiliates').send(validBody).expect(201);

      const [{ password }] = await dataSource.query('SELECT password FROM users WHERE email = $1', [
        'marina@email.com',
      ]);

      expect(password).toBeNull();
    });

    it('records the initial transition in the audit trail', async () => {
      await request(app.getHttpServer()).post('/v1/mobile/affiliates').send(validBody).expect(201);

      const rows = await dataSource.query(
        `SELECT from_status, to_status FROM affiliate_status_history`,
      );

      expect(rows).toEqual([{ from_status: null, to_status: 'PENDING_APPROVAL' }]);
    });

    it('rejects a registration without the terms acceptance', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send({ ...validBody, termsAccepted: false })
        .expect(400);

      expect(response.body.code).toBe('TERMS_NOT_ACCEPTED');
    });

    it('rejects a name without a surname', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send({ ...validBody, fullName: 'Marina' })
        .expect(400);

      expect(response.body.message).toBe('Informe o nome completo.');
    });

    it('answers a single message string when several fields are invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send({ ...validBody, email: 'nope', cpf: '1' })
        .expect(400);

      expect(response.body.message).toBe('Informe um e-mail válido. Informe um CPF válido.');
    });

    it('rejects an unknown field', async () => {
      await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send({ ...validBody, unknownField: 'nope' })
        .expect(400);
    });

    it('rejects a duplicated email', async () => {
      await request(app.getHttpServer()).post('/v1/mobile/affiliates').send(validBody).expect(201);

      const response = await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send({ ...validBody, cpf: '111.444.777-35', pixKey: '111.444.777-35', pixKeyType: 'CPF' })
        .expect(409);

      expect(response.body.code).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('rejects a duplicated cpf', async () => {
      await request(app.getHttpServer()).post('/v1/mobile/affiliates').send(validBody).expect(201);

      const response = await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send({ ...validBody, email: 'outra@email.com' })
        .expect(409);

      expect(response.body.code).toBe('CPF_ALREADY_REGISTERED');
    });

    it('rejects a terms version that is no longer current', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send({ ...validBody, termsVersion: '0.9-homolog' })
        .expect(400);

      expect(response.body.code).toBe('OUTDATED_TERMS');
    });

    it('rejects a pix key of type cpf that differs from the informed cpf', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/mobile/affiliates')
        .send({ ...validBody, pixKeyType: 'CPF', pixKey: '111.444.777-35' })
        .expect(400);

      expect(response.body.code).toBe('PIX_KEY_MISMATCH');
    });

    it('sends the registration received email', async () => {
      await request(app.getHttpServer()).post('/v1/mobile/affiliates').send(validBody).expect(201);

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          template: MailTemplateEnum.REGISTRATION_RECEIVED,
          to: 'marina@email.com',
        }),
      );
    });
  });
});

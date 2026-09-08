import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { MailTemplateEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { AppModule } from '../src/app.module';
import { MAILER } from '../src/domain/notifications/mailer';
import { HttpExceptionFilter } from '../src/infra/shared/filters/http-exception.filter';
import { mailerMock } from '../src/testing/mocks/services/mailer.mock';

describe('Affiliate registration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailer: ReturnType<typeof mailerMock>;

  const validBody = {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '529.982.247-25',
    rg: '12.345.678-X',
    pixKeyType: 'EMAIL',
    pixKey: 'marina@email.com',
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

  describe('POST /v1/affiliates', () => {
    it('registers an affiliate pending approval', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send(validBody)
        .expect(201);

      expect(response.body).toEqual({
        publicId: expect.any(String),
        status: 'PENDING_APPROVAL',
      });
    });

    it('does not create a password for the pre-registration', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      const [{ password }] = await dataSource.query('SELECT password FROM users WHERE email = $1', [
        'marina@email.com',
      ]);

      expect(password).toBeNull();
    });

    it('records the initial transition in the audit trail', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      const rows = await dataSource.query(
        `SELECT from_status, to_status FROM affiliate_status_history`,
      );

      expect(rows).toEqual([{ from_status: null, to_status: 'PENDING_APPROVAL' }]);
    });

    it('rejects a name without a surname', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, fullName: 'Marina' })
        .expect(400);

      expect(response.body.message).toEqual(['Informe o nome completo.']);
    });

    it('answers an array with one message per invalid field', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, email: 'nope', cpf: '1' })
        .expect(400);

      expect(response.body.message).toEqual([
        'Informe um e-mail válido.',
        'Informe um CPF válido.',
      ]);
    });

    it('answers only one message for a field with several failing constraints', async () => {
      const { fullName: _fullName, ...bodyWithoutName } = validBody;

      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send(bodyWithoutName)
        .expect(400);

      expect(response.body.message).toEqual(['Informe o nome completo.']);
    });

    it('rejects an unknown field', async () => {
      await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, unknownField: 'nope' })
        .expect(400);
    });

    it('rejects a duplicated email', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, cpf: '111.444.777-35', pixKey: '111.444.777-35', pixKeyType: 'CPF' })
        .expect(409);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED);
    });

    it('rejects a duplicated cpf', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, email: 'outra@email.com' })
        .expect(409);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.CPF_ALREADY_REGISTERED);
    });

    it('rejects a pix key of type cpf that differs from the informed cpf', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, pixKeyType: 'CPF', pixKey: '111.444.777-35' })
        .expect(400);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.PIX_KEY_MISMATCH);
    });

    it('sends the registration received email', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          template: MailTemplateEnum.REGISTRATION_RECEIVED,
          to: 'marina@email.com',
        }),
      );
    });

    it('stores the rg without punctuation', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      const [{ rg }] = await dataSource.query('SELECT rg FROM affiliates');

      expect(rg).toBe('12345678X');
    });

    it('registers the social profile the person informed', async () => {
      await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, socialNetwork: 'INSTAGRAM', socialHandle: '@marina.ferraz' })
        .expect(201);

      const [row] = await dataSource.query('SELECT social_network, social_handle FROM affiliates');

      expect(row).toEqual({ social_network: 'INSTAGRAM', social_handle: 'marina.ferraz' });
    });

    it('registers an affiliate that informed no social profile', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      const [row] = await dataSource.query('SELECT social_network, social_handle FROM affiliates');

      expect(row).toEqual({ social_network: null, social_handle: null });
    });

    it('rejects a registration without the rg', async () => {
      const { rg: _rg, ...bodyWithoutRg } = validBody;

      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send(bodyWithoutRg)
        .expect(400);

      expect(response.body.message).toEqual(['Informe um RG válido.']);
    });

    it('rejects an rg shorter than five characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, rg: '1234' })
        .expect(400);

      expect(response.body.message).toEqual(['Informe um RG válido.']);
    });

    it('rejects a duplicated rg', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({
          ...validBody,
          email: 'outra@email.com',
          cpf: '111.444.777-35',
          rg: '12345678x',
        })
        .expect(409);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.RG_ALREADY_REGISTERED);
    });

    it('rejects a social network without the handle', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, socialNetwork: 'INSTAGRAM' })
        .expect(400);

      expect(response.body.message).toEqual(['Informe o @ da rede escolhida.']);
    });

    it('rejects a handle without the social network', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, socialHandle: '@marinaferraz' })
        .expect(400);

      expect(response.body.message).toEqual(['Escolha a rede social do @ informado.']);
    });

    it('rejects an unknown social network', async () => {
      await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, socialNetwork: 'ORKUT', socialHandle: 'marinaferraz' })
        .expect(400);
    });

    it('rejects a handle with a space', async () => {
      await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, socialNetwork: 'TIKTOK', socialHandle: 'marina ferraz' })
        .expect(400);
    });

    it('rejects a registration that did not accept the terms', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/affiliates')
        .send({ ...validBody, termsAccepted: false })
        .expect(400);

      expect(response.body.message).toEqual(['É preciso aceitar o Regulamento do programa.']);
    });

    it('rejects a registration sent without the acceptance field', async () => {
      const { termsAccepted: _termsAccepted, ...bodyWithoutTerms } = validBody;

      await request(app.getHttpServer()).post('/v1/affiliates').send(bodyWithoutTerms).expect(400);
    });

    it('records when the terms were accepted', async () => {
      await request(app.getHttpServer()).post('/v1/affiliates').send(validBody).expect(201);

      const [{ terms_accepted_at: termsAcceptedAt }] = await dataSource.query(
        'SELECT terms_accepted_at FROM affiliates',
      );

      expect(termsAcceptedAt).toBeInstanceOf(Date);
    });
  });
});

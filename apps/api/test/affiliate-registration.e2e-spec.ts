import request from 'supertest';
import { RegistrationErrorCodeEnum } from '@porto/contracts';
import {
  AFFILIATE_REPOSITORY,
  AffiliateRepository,
} from '../src/domain/affiliates/affiliate.repository';
import { USER_REPOSITORY, UserRepository } from '../src/domain/users/user.repository';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import { CLEIDE, register } from './e2e-fixtures';

/*
  O cadastro público do lado de fora: o DTO (o que só ele valida), o que a
  transação grava e os índices únicos. A regra de CPF, RG e chave PIX é dos
  testes do `CreateAffiliateUseCase`.
*/
describe('Affiliate registration (e2e)', () => {
  let e2e: E2eApp;

  const validBody = {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '529.982.247-25',
    rg: '12.345.678-X',
    pixKeyType: 'EMAIL',
    pixKey: 'marina@email.com',
    termsAccepted: true,
  };

  function signUp(body: object) {
    return request(e2e.app.getHttpServer()).post('/v1/affiliates').send(body);
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  describe('POST /v1/affiliates', () => {
    it('registers pending approval, opens the trail and mails the confirmation', async () => {
      const response = await signUp(validBody).expect(201);

      expect(response.body).toEqual({ publicId: expect.any(String), status: 'PENDING_APPROVAL' });
      expect(
        await e2e.dataSource.query('SELECT from_status, to_status FROM affiliate_status_history'),
      ).toEqual([{ from_status: null, to_status: 'PENDING_APPROVAL' }]);
      expect(e2e.mail.sentTo(validBody.email)).toHaveLength(1);
    });

    it('stores the social profile without the at sign', async () => {
      await signUp({
        ...validBody,
        socialNetwork: 'INSTAGRAM',
        socialHandle: '@marina.ferraz',
      }).expect(201);

      const [row] = await e2e.dataSource.query(
        'SELECT social_network, social_handle FROM affiliates',
      );

      expect(row).toEqual({ social_network: 'INSTAGRAM', social_handle: 'marina.ferraz' });
    });

    it('rejects a name without a surname', async () => {
      const response = await signUp({ ...validBody, fullName: 'Marina' }).expect(400);

      expect(response.body.message).toEqual(['Informe o nome completo.']);
    });

    it('answers an array with one message per invalid field', async () => {
      const response = await signUp({ ...validBody, email: 'nope', cpf: '1' }).expect(400);

      expect(response.body.message).toEqual([
        'Informe um e-mail válido.',
        'Informe um CPF válido.',
      ]);
    });

    it('answers only one message for a field with several failing constraints', async () => {
      const { fullName: _fullName, ...bodyWithoutName } = validBody;

      const response = await signUp(bodyWithoutName).expect(400);

      expect(response.body.message).toEqual(['Informe o nome completo.']);
    });

    it('rejects an unknown field', async () => {
      await signUp({ ...validBody, unknownField: 'nope' }).expect(400);
    });

    it('rejects an rg shorter than five characters', async () => {
      const response = await signUp({ ...validBody, rg: '1234' }).expect(400);

      expect(response.body.message).toEqual(['Informe um RG válido.']);
    });

    it('rejects a social network without the handle', async () => {
      const response = await signUp({ ...validBody, socialNetwork: 'INSTAGRAM' }).expect(400);

      expect(response.body.message).toEqual(['Informe o @ da rede escolhida.']);
    });

    it('rejects a handle without the social network', async () => {
      const response = await signUp({ ...validBody, socialHandle: '@marinaferraz' }).expect(400);

      expect(response.body.message).toEqual(['Escolha a rede social do @ informado.']);
    });

    it('rejects a handle with a space', async () => {
      await signUp({ ...validBody, socialNetwork: 'TIKTOK', socialHandle: 'marina ferraz' }).expect(
        400,
      );
    });

    it('rejects a registration that did not accept the terms', async () => {
      const response = await signUp({ ...validBody, termsAccepted: false }).expect(400);

      expect(response.body.message).toEqual(['É preciso aceitar o Regulamento do programa.']);
    });

    it('rejects an rg already registered, whatever the case of its letter', async () => {
      await signUp(validBody).expect(201);

      const response = await signUp({
        ...validBody,
        email: 'outra@email.com',
        cpf: '111.444.777-35',
        rg: '12345678x',
      }).expect(409);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.RG_ALREADY_REGISTERED);
    });

    /*
      Dois cadastros com o mesmo CPF chegando juntos passam os dois pela checagem
      do use case, e quem decide é o índice único. O dublê faz a checagem não ver
      o primeiro — é a corrida, sem depender do agendador. Sem a tradução, o
      segundo recebe 500; sem a transação, fica um usuário sem cadastro de
      afiliado, com o e-mail preso para sempre.
    */
    it('lets the unique index refuse a cpf that slipped past the check, leaving no user behind', async () => {
      await register(e2e.app, CLEIDE);
      jest
        .spyOn(e2e.app.get<AffiliateRepository>(AFFILIATE_REPOSITORY), 'findByCpf')
        .mockResolvedValueOnce(null);

      const response = await signUp({ ...validBody, cpf: CLEIDE.cpf }).expect(409);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.CPF_ALREADY_REGISTERED);
      expect(
        await e2e.dataSource.query('SELECT email FROM users WHERE email = $1', [validBody.email]),
      ).toEqual([]);
    });

    it('lets the unique index refuse an email that slipped past the check', async () => {
      await register(e2e.app, CLEIDE);
      jest
        .spyOn(e2e.app.get<UserRepository>(USER_REPOSITORY), 'findByEmail')
        .mockResolvedValueOnce(null);

      const response = await signUp({ ...validBody, email: CLEIDE.email }).expect(409);

      expect(response.body.code).toBe(RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED);
    });
  });
});

import request from 'supertest';
import { createE2eApp, type E2eApp, resetDatabase } from './e2e-app';
import {
  approve,
  CLEIDE,
  lastLinkTo,
  MARINA,
  register,
  signInOperator,
  tokenOf,
} from './e2e-fixtures';

const PASSWORD = 'MinhaSenha!2026';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

const MODULE = {
  title: 'Módulo 1 - Porto Serviço',
  description: 'Quem somos nós? O que nós proporcionamos?',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  durationMinutes: 5,
  position: 1,
};

const MATERIAL = {
  title: 'Mídia Kit',
  description: 'Baixe a cartilha com dicas e orientações de marketing para afiliados.',
  fileUrl: 'https://cdn.example.com/afiliados/midia-kit.pdf',
  fileFormat: 'PDF',
  fileSizeBytes: 2_400_000,
  position: 1,
};

/*
  O painel cadastra, o afiliado assiste e baixa. O conteúdo entra pela rota do
  painel, como em produção, e é lido pela rota do afiliado — é o caminho inteiro
  que precisa fechar.
*/
describe('Training modules and promotional materials (e2e)', () => {
  let e2e: E2eApp;
  let operatorToken: string;

  function api() {
    return request(e2e.app.getHttpServer());
  }

  function asOperator(method: 'get' | 'post' | 'put' | 'delete', path: string) {
    return api()[method](path).set('Authorization', `Bearer ${operatorToken}`);
  }

  async function createModule(overrides: Partial<typeof MODULE> = {}): Promise<string> {
    const response = await asOperator('post', '/v1/admin/training-modules')
      .send({ ...MODULE, ...overrides })
      .expect(201);

    return response.body.id;
  }

  /** Aprova, cria a senha pelo link do e-mail e entra. */
  async function signedIn(affiliate: { email: string }): Promise<string> {
    await approve(e2e.app, operatorToken, await register(e2e.app, affiliate));
    await api()
      .post('/v1/affiliate/auth/set-password')
      .send({ token: tokenOf(lastLinkTo(e2e.mail, affiliate.email)), password: PASSWORD })
      .expect(204);
    const login = await api()
      .post('/v1/affiliate/auth/login')
      .send({ email: affiliate.email, password: PASSWORD })
      .expect(200);

    return login.body.accessToken;
  }

  function materials(token: string) {
    return api().get('/v1/affiliate/me/materials').set('Authorization', `Bearer ${token}`);
  }

  function complete(token: string, modulePublicId: string) {
    return api()
      .put(`/v1/affiliate/me/training-modules/${modulePublicId}/completion`)
      .set('Authorization', `Bearer ${token}`);
  }

  beforeAll(async () => {
    e2e = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(e2e);
    operatorToken = await signInOperator(e2e.app, e2e.dataSource);
  });

  afterAll(async () => {
    await e2e.app.close();
  });

  it('hands the affiliate the track in position order, ties broken by creation', async () => {
    await createModule({ title: 'Módulo 3 - Fechadura Digital', position: 3 });
    await createModule({ title: 'Módulo 1 - Porto Serviço', position: 1 });
    await createModule({ title: 'Módulo 2 - Encanador', position: 2 });
    await createModule({ title: 'Módulo 2 - Encanador (extra)', position: 2 });
    const token = await signedIn(MARINA);

    const response = await materials(token).expect(200);

    expect(response.body.trainingModules.map((module: { title: string }) => module.title)).toEqual([
      'Módulo 1 - Porto Serviço',
      'Módulo 2 - Encanador',
      'Módulo 2 - Encanador (extra)',
      'Módulo 3 - Fechadura Digital',
    ]);
  });

  it('hands out the public id and never the serial one', async () => {
    await createModule();
    await asOperator('post', '/v1/admin/promotional-materials').send(MATERIAL).expect(201);
    const token = await signedIn(MARINA);

    const response = await materials(token).expect(200);

    const { position: _modulePosition, ...module } = MODULE;
    const { position: _materialPosition, ...material } = MATERIAL;
    const uuid = expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/);
    expect(response.body).toEqual({
      trainingModules: [{ ...module, id: uuid, completed: false }],
      promotionalMaterials: [{ ...material, id: uuid }],
    });
  });

  it('keeps each affiliate progress apart, and marking twice changes nothing', async () => {
    const moduleId = await createModule();
    const marina = await signedIn(MARINA);
    const cleide = await signedIn(CLEIDE);

    await complete(marina, moduleId).expect(204);
    await complete(marina, moduleId).expect(204);

    const [marinaView, cleideView] = await Promise.all([
      materials(marina).expect(200),
      materials(cleide).expect(200),
    ]);
    expect(marinaView.body.trainingModules[0].completed).toBe(true);
    expect(cleideView.body.trainingModules[0].completed).toBe(false);
  });

  it('refuses to mark a module that does not exist', async () => {
    const token = await signedIn(MARINA);

    const response = await complete(token, UNKNOWN_ID).expect(404);

    expect(response.body.message).toBe('Módulo da trilha não encontrado.');
  });

  /* A conclusão aponta para o módulo; sem o cascade, apagar um módulo assistido seria 500. */
  it('takes the progress along when the operator deletes a watched module', async () => {
    const moduleId = await createModule();
    const token = await signedIn(MARINA);
    await complete(token, moduleId).expect(204);

    await asOperator('delete', `/v1/admin/training-modules/${moduleId}`).expect(204);

    const [{ count }] = await e2e.dataSource.query(
      'SELECT count(*)::int AS count FROM training_module_completions',
    );
    expect(count).toBe(0);
    expect((await materials(token).expect(200)).body.trainingModules).toEqual([]);
  });

  it('replaces the whole module on update, keeping who already watched it', async () => {
    const moduleId = await createModule();
    const token = await signedIn(MARINA);
    await complete(token, moduleId).expect(204);

    const response = await asOperator('put', `/v1/admin/training-modules/${moduleId}`)
      .send({ ...MODULE, title: 'Módulo 1 - Quem somos', durationMinutes: 7 })
      .expect(200);

    expect(response.body).toEqual({
      ...MODULE,
      id: moduleId,
      title: 'Módulo 1 - Quem somos',
      durationMinutes: 7,
    });
    expect((await materials(token).expect(200)).body.trainingModules[0].completed).toBe(true);
  });

  it.each([
    ['put', `/v1/admin/training-modules/${UNKNOWN_ID}`, MODULE],
    ['delete', `/v1/admin/training-modules/${UNKNOWN_ID}`, undefined],
    ['put', `/v1/admin/promotional-materials/${UNKNOWN_ID}`, MATERIAL],
    ['delete', `/v1/admin/promotional-materials/${UNKNOWN_ID}`, undefined],
  ] as const)('answers 404 to %s on %s', async (method, path, body) => {
    await asOperator(method, path).send(body).expect(404);
  });

  /* O endereço vai para um `<iframe>` ou um link numa página segura: http seria conteúdo misto. */
  it.each([
    ['training-modules', { ...MODULE, videoUrl: 'http://www.youtube.com/watch?v=dQw4w9WgXcQ' }],
    ['promotional-materials', { ...MATERIAL, fileUrl: 'http://cdn.example.com/kit.pdf' }],
  ])('refuses an address that is not https on %s', async (resource, body) => {
    const response = await asOperator('post', `/v1/admin/${resource}`).send(body).expect(400);

    expect(response.body.message).toEqual(['Informe uma URL que comece com https://']);
  });

  it('refuses a file format outside the list', async () => {
    await asOperator('post', '/v1/admin/promotional-materials')
      .send({ ...MATERIAL, fileFormat: 'EXE' })
      .expect(400);
  });

  it('keeps the affiliate out of the admin routes', async () => {
    const token = await signedIn(MARINA);

    await api()
      .post('/v1/admin/training-modules')
      .set('Authorization', `Bearer ${token}`)
      .send(MODULE)
      .expect(403);
  });
});

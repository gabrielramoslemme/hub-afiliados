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
};

const MATERIAL = {
  title: 'Mídia Kit',
  description: 'Baixe a cartilha com dicas e orientações de marketing para afiliados.',
  fileUrl: 'https://cdn.example.com/afiliados/midia-kit.pdf',
  fileFormat: 'PDF',
  fileSizeBytes: 2_400_000,
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

  function uncomplete(token: string, modulePublicId: string) {
    return api()
      .delete(`/v1/affiliate/me/training-modules/${modulePublicId}/completion`)
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

  function titlesOf(body: { trainingModules: Array<{ title: string }> }): string[] {
    return body.trainingModules.map((module) => module.title);
  }

  function reorder(resource: string, ids: string[]) {
    return asOperator('put', `/v1/admin/${resource}/order`).send({ ids });
  }

  it('appends a new module at the end of the track', async () => {
    await createModule({ title: 'Módulo 1 - Porto Serviço' });
    await createModule({ title: 'Módulo 2 - Encanador' });

    const response = await asOperator('get', '/v1/admin/training-modules').expect(200);

    expect(response.body.map((module: { position: number }) => module.position)).toEqual([1, 2]);
  });

  it('hands the affiliate the track in the order the operator dragged it to', async () => {
    const first = await createModule({ title: 'Módulo 1 - Porto Serviço' });
    const second = await createModule({ title: 'Módulo 2 - Encanador' });
    const third = await createModule({ title: 'Módulo 3 - Fechadura Digital' });
    const token = await signedIn(MARINA);

    await reorder('training-modules', [third, first, second]).expect(204);

    expect(titlesOf((await materials(token).expect(200)).body)).toEqual([
      'Módulo 3 - Fechadura Digital',
      'Módulo 1 - Porto Serviço',
      'Módulo 2 - Encanador',
    ]);
  });

  it('reorders the downloads through the same rule', async () => {
    const kit = (
      await asOperator('post', '/v1/admin/promotional-materials').send(MATERIAL).expect(201)
    ).body.id;
    const creatives = (
      await asOperator('post', '/v1/admin/promotional-materials')
        .send({ ...MATERIAL, title: 'Criativos Estáticos' })
        .expect(201)
    ).body.id;

    await reorder('promotional-materials', [creatives, kit]).expect(204);

    const response = await asOperator('get', '/v1/admin/promotional-materials').expect(200);
    expect(response.body.map((material: { title: string }) => material.title)).toEqual([
      'Criativos Estáticos',
      'Mídia Kit',
    ]);
  });

  /* Outra aba criou um módulo depois que esta carregou: gravar a ordem velha deixaria o novo sem lugar. */
  it('refuses an order that leaves out a module created meanwhile, writing nothing', async () => {
    const first = await createModule({ title: 'Módulo 1 - Porto Serviço' });
    const second = await createModule({ title: 'Módulo 2 - Encanador' });
    await createModule({ title: 'Módulo 3 - Fechadura Digital' });

    const response = await reorder('training-modules', [second, first]).expect(409);

    expect(response.body.message).toBe(
      'A lista mudou enquanto você reorganizava. Atualize a página e tente de novo.',
    );
    const list = await asOperator('get', '/v1/admin/training-modules').expect(200);
    expect(list.body.map((module: { title: string }) => module.title)).toEqual([
      'Módulo 1 - Porto Serviço',
      'Módulo 2 - Encanador',
      'Módulo 3 - Fechadura Digital',
    ]);
  });

  it.each([
    ['a repeated id', (id: string) => [id, id], 'A ordem repete um item'],
    ['an id that is not a uuid', () => ['modulo-1'], 'Item inválido na ordem'],
  ])('refuses an order with %s', async (_case, ids, message) => {
    const id = await createModule();

    const response = await reorder('training-modules', ids(id)).expect(400);

    expect(response.body.message).toEqual([message]);
  });

  it('hands out the public id and never the serial one', async () => {
    await createModule();
    await asOperator('post', '/v1/admin/promotional-materials').send(MATERIAL).expect(201);
    const token = await signedIn(MARINA);

    const response = await materials(token).expect(200);

    const uuid = expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/);
    expect(response.body).toEqual({
      trainingModules: [{ ...MODULE, id: uuid, completed: false }],
      promotionalMaterials: [{ ...MATERIAL, id: uuid }],
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

  it('clears only the mark of who unmarked it, and unmarking twice changes nothing', async () => {
    const moduleId = await createModule();
    const marina = await signedIn(MARINA);
    const cleide = await signedIn(CLEIDE);
    await complete(marina, moduleId).expect(204);
    await complete(cleide, moduleId).expect(204);

    await uncomplete(marina, moduleId).expect(204);
    await uncomplete(marina, moduleId).expect(204);

    const [marinaView, cleideView] = await Promise.all([
      materials(marina).expect(200),
      materials(cleide).expect(200),
    ]);
    expect(marinaView.body.trainingModules[0].completed).toBe(false);
    expect(cleideView.body.trainingModules[0].completed).toBe(true);
  });

  it('refuses to unmark a module that does not exist', async () => {
    const token = await signedIn(MARINA);

    const response = await uncomplete(token, UNKNOWN_ID).expect(404);

    expect(response.body.message).toBe('Módulo da trilha não encontrado.');
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
      position: 1,
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

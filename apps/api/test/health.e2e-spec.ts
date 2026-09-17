import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { createE2eTestingModule } from './create-e2e-testing-module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await createE2eTestingModule().compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds 200 with status ok', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', uptime: expect.any(Number) });
  });

  // Com o guard global no ar, este 200 só acontece porque a rota declara
  // `@Public()`. A negação por omissão é provada em `admin-affiliates.e2e-spec`,
  // com uma rota que existe: o roteador do Nest devolve 404 antes do guard, e
  // por isso uma rota inexistente não serve de prova.
});

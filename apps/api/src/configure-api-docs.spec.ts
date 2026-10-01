import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { EnvironmentVariables } from '@Infra/config/environment-variables';
import { configServiceMock } from '@Testing/mocks/services/config-service.mock';
import { configureApiDocs } from './configure-api-docs';

function appWith(nodeEnv: EnvironmentVariables['NODE_ENV']): INestApplication {
  const configService = configServiceMock({ NODE_ENV: nodeEnv });

  return {
    get: (token: unknown) => (token === ConfigService ? configService : undefined),
  } as unknown as INestApplication;
}

describe('configureApiDocs', () => {
  let setup: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(SwaggerModule, 'createDocument').mockReturnValue({} as OpenAPIObject);
    setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /*
    A API sai na internet pelo CloudFront: em produção o Swagger entregaria o
    mapa de toda rota, com os campos de cada DTO, a quem pedisse.
  */
  it('does not serve the docs in production', () => {
    configureApiDocs(appWith('production'));

    expect(setup).not.toHaveBeenCalled();
  });

  it.each(['development', 'test'] as const)('serves the docs under /v1/docs in %s', (nodeEnv) => {
    configureApiDocs(appWith(nodeEnv));

    expect(setup).toHaveBeenCalledWith('v1/docs', expect.anything(), expect.anything());
  });
});

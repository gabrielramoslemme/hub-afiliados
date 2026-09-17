import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@Infra/config/environment-variables';

/**
 * Um `ConfigService` de verdade, carregado só com o que o teste passa. Dublê
 * com `get: jest.fn()` exigiria `as unknown as` para caber no tipo genérico, e
 * o cast esconderia justamente a chave com nome errado.
 */
export const configServiceMock = (
  values: Partial<EnvironmentVariables>,
): ConfigService<EnvironmentVariables, true> => new ConfigService(values);

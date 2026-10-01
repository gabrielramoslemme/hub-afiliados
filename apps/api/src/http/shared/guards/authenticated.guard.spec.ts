import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { ValidateSessionUseCase } from '@Application/auth/validate-session.use-case';
import { AccessTokenClaims } from '@Domain/auth/access-token';
import { SessionRevokedError } from '@Domain/auth/auth.errors';
import { buildAdminUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { accessTokenVerifierMock } from '@Testing/mocks/services/access-token-verifier.mock';
import { AuthenticatedRequest } from '../authenticated-request';
import { AuthenticatedGuard } from './authenticated.guard';

interface TestContext {
  context: ExecutionContext;
  request: AuthenticatedRequest;
}

// O `Reflector` de verdade lê metadata do handler e da classe, então os dois
// precisam ser alvos reais — `undefined` quebra com TypeError antes do guard.
function handler(): void {}
class Controller {}

function contextWith(authorization?: string): TestContext {
  const request = {
    headers: authorization ? { authorization } : {},
  } as AuthenticatedRequest;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => Controller,
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('AuthenticatedGuard', () => {
  const operator = buildAdminUser({ name: 'Analista Porto', tokenVersion: 2 });
  const claims: AccessTokenClaims = {
    sub: operator.publicId,
    aud: AuthAudienceEnum.ADMIN,
    role: UserRoleEnum.PORTO_ANALYST,
    name: 'Analista Porto',
    ver: 2,
  };

  function sessions(): ValidateSessionUseCase {
    const userRepository = userRepositoryMock();
    userRepository.findByPublicId.mockResolvedValue({ ...operator, affiliate: null });

    return new ValidateSessionUseCase(userRepository);
  }

  it.each([
    ['without an authorization header', undefined],
    ['with a token the verifier does not accept', 'Bearer nope'],
  ])('rejects a request %s', async (_label, authorization) => {
    const guard = new AuthenticatedGuard(new Reflector(), accessTokenVerifierMock(), sessions());

    await expect(guard.canActivate(contextWith(authorization).context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ignores an authorization header of another scheme', async () => {
    const verifier = accessTokenVerifierMock();
    const guard = new AuthenticatedGuard(new Reflector(), verifier, sessions());

    await expect(guard.canActivate(contextWith('Basic dXNlcjpwYXNz').context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verifier.verify).toHaveBeenCalledWith('');
  });

  it('allows a public route without any token', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const guard = new AuthenticatedGuard(reflector, accessTokenVerifierMock(), sessions());

    await expect(guard.canActivate(contextWith().context)).resolves.toBe(true);
  });

  it('publishes the verified claims on the request', async () => {
    const verifier = accessTokenVerifierMock();
    verifier.verify.mockResolvedValue(claims);
    const guard = new AuthenticatedGuard(new Reflector(), verifier, sessions());
    const { context, request } = contextWith('Bearer good.token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith('good.token');
    expect(request.auth).toEqual(claims);
  });

  it('rejects a well signed token of a session the account ended', async () => {
    const verifier = accessTokenVerifierMock();
    verifier.verify.mockResolvedValue({ ...claims, ver: 1 });
    const guard = new AuthenticatedGuard(new Reflector(), verifier, sessions());

    await expect(guard.canActivate(contextWith('Bearer old.token').context)).rejects.toThrow(
      SessionRevokedError,
    );
  });
});

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { AccessTokenClaims } from '@Domain/auth/access-token';
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
  const claims: AccessTokenClaims = {
    sub: '00000000-0000-4000-8000-000000000001',
    aud: AuthAudienceEnum.ADMIN,
    role: UserRoleEnum.PORTO_ANALYST,
    name: 'Analista Porto',
  };

  it('rejects a request without an authorization header', async () => {
    const guard = new AuthenticatedGuard(new Reflector(), accessTokenVerifierMock());

    await expect(guard.canActivate(contextWith().context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token the verifier does not accept', async () => {
    const guard = new AuthenticatedGuard(new Reflector(), accessTokenVerifierMock());

    await expect(guard.canActivate(contextWith('Bearer nope').context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ignores an authorization header of another scheme', async () => {
    const verifier = accessTokenVerifierMock();
    const guard = new AuthenticatedGuard(new Reflector(), verifier);

    await expect(guard.canActivate(contextWith('Basic dXNlcjpwYXNz').context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verifier.verify).toHaveBeenCalledWith('');
  });

  it('allows a public route without any token', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const guard = new AuthenticatedGuard(reflector, accessTokenVerifierMock());

    await expect(guard.canActivate(contextWith().context)).resolves.toBe(true);
  });

  it('publishes the verified claims on the request', async () => {
    const verifier = accessTokenVerifierMock();
    verifier.verify.mockResolvedValue(claims);
    const guard = new AuthenticatedGuard(new Reflector(), verifier);
    const { context, request } = contextWith('Bearer good.token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith('good.token');
    expect(request.auth).toEqual(claims);
  });
});

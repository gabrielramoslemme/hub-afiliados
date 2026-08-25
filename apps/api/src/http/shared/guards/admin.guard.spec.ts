import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { AccessTokenClaims } from '@Domain/auth/access-token';
import { AuthenticatedRequest } from '../authenticated-request';
import { AdminGuard } from './admin.guard';

interface TestContext {
  context: ExecutionContext;
  request: AuthenticatedRequest;
}

// O `Reflector` de verdade lê metadata do handler e da classe, então os dois
// precisam ser alvos reais — `undefined` quebra com TypeError antes do guard.
function handler(): void {}
class Controller {}

function contextWith(auth?: AccessTokenClaims): TestContext {
  const request = { headers: {}, auth } as AuthenticatedRequest;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => Controller,
  } as unknown as ExecutionContext;

  return { context, request };
}

function adminClaims(role: UserRoleEnum = UserRoleEnum.PORTO_ANALYST): AccessTokenClaims {
  return {
    sub: '00000000-0000-4000-8000-000000000001',
    aud: AuthAudienceEnum.ADMIN,
    role,
    name: 'Analista Porto',
  };
}

describe('AdminGuard', () => {
  it('rejects a request the authentication guard did not verify', () => {
    const guard = new AdminGuard(new Reflector());

    expect(() => guard.canActivate(contextWith().context)).toThrow(ForbiddenException);
  });

  it('rejects a token issued for the affiliate channel', () => {
    const guard = new AdminGuard(new Reflector());
    const affiliateToken = { ...adminClaims(), aud: AuthAudienceEnum.AFFILIATE, role: null };

    expect(() => guard.canActivate(contextWith(affiliateToken).context)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a role outside the ones the route declares', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRoleEnum.PORTO_ADMIN]);
    const guard = new AdminGuard(reflector);

    expect(() => guard.canActivate(contextWith(adminClaims()).context)).toThrow(ForbiddenException);
  });

  it('accepts a role the route declares', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRoleEnum.PORTO_ANALYST]);
    const guard = new AdminGuard(reflector);

    expect(guard.canActivate(contextWith(adminClaims()).context)).toBe(true);
  });

  it('publishes the actor for any operator when the route declares no role', () => {
    const guard = new AdminGuard(new Reflector());
    const { context, request } = contextWith(adminClaims(UserRoleEnum.MESA_ADMIN));

    expect(guard.canActivate(context)).toBe(true);
    expect(request.actor).toEqual({
      publicId: '00000000-0000-4000-8000-000000000001',
      name: 'Analista Porto',
      role: UserRoleEnum.MESA_ADMIN,
    });
  });
});

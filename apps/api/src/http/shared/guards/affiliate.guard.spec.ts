import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { AccessTokenClaims } from '@Domain/auth/access-token';
import { AuthenticatedRequest } from '../authenticated-request';
import { AffiliateGuard } from './affiliate.guard';

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

const affiliateClaims: AccessTokenClaims = {
  sub: '00000000-0000-4000-8000-000000000001',
  aud: AuthAudienceEnum.AFFILIATE,
  role: UserRoleEnum.AFFILIATE,
  name: 'Marina Ferraz',
};

function guardForRoute(roles?: UserRoleEnum[]): AffiliateGuard {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  return new AffiliateGuard(reflector);
}

describe('AffiliateGuard', () => {
  it('rejects a request the authentication guard did not verify', () => {
    const guard = guardForRoute([UserRoleEnum.AFFILIATE]);

    expect(() => guard.canActivate(contextWith().context)).toThrow(ForbiddenException);
  });

  it('rejects a token issued for the panel', () => {
    const guard = guardForRoute([UserRoleEnum.AFFILIATE]);
    const operator = {
      ...affiliateClaims,
      aud: AuthAudienceEnum.ADMIN,
      role: UserRoleEnum.PORTO_ANALYST,
    };

    expect(() => guard.canActivate(contextWith(operator).context)).toThrow(ForbiddenException);
  });

  it('rejects a route that declares no role', () => {
    const guard = guardForRoute(undefined);

    expect(() => guard.canActivate(contextWith(affiliateClaims).context)).toThrow(
      ForbiddenException,
    );
  });

  /* O token emitido antes de o afiliado ganhar perfil: a web o manda entrar de novo. */
  it('rejects an affiliate token that carries no role', () => {
    const guard = guardForRoute([UserRoleEnum.AFFILIATE]);

    expect(() =>
      guard.canActivate(contextWith({ ...affiliateClaims, role: null }).context),
    ).toThrow(ForbiddenException);
  });

  it('publishes the actor when the role is one the route declares', () => {
    const guard = guardForRoute([UserRoleEnum.AFFILIATE]);
    const { context, request } = contextWith(affiliateClaims);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.actor).toEqual({
      publicId: affiliateClaims.sub,
      name: 'Marina Ferraz',
      role: UserRoleEnum.AFFILIATE,
    });
  });
});

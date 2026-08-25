import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { AccessTokenClaims } from '@Domain/auth/access-token';
import { AuthenticatedRequest } from '../authenticated-request';
import { AffiliateGuard } from './affiliate.guard';

interface TestContext {
  context: ExecutionContext;
  request: AuthenticatedRequest;
}

function contextWith(auth?: AccessTokenClaims): TestContext {
  const request = { headers: {}, auth } as AuthenticatedRequest;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

const affiliateClaims: AccessTokenClaims = {
  sub: '00000000-0000-4000-8000-000000000001',
  aud: AuthAudienceEnum.AFFILIATE,
  role: null,
  name: 'Marina Ferraz',
};

describe('AffiliateGuard', () => {
  const guard = new AffiliateGuard();

  it('rejects a request the authentication guard did not verify', () => {
    expect(() => guard.canActivate(contextWith().context)).toThrow(ForbiddenException);
  });

  it('rejects a token issued for the panel', () => {
    const operator = {
      ...affiliateClaims,
      aud: AuthAudienceEnum.ADMIN,
      role: UserRoleEnum.PORTO_ANALYST,
    };

    expect(() => guard.canActivate(contextWith(operator).context)).toThrow(ForbiddenException);
  });

  it('publishes the actor of an affiliate token', () => {
    const { context, request } = contextWith(affiliateClaims);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.actor).toEqual({
      publicId: affiliateClaims.sub,
      name: 'Marina Ferraz',
      role: null,
    });
  });
});

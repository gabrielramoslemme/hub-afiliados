import { JwtService } from '@nestjs/jwt';
import { AuthAudienceEnum, UserRoleEnum } from '@porto/contracts';
import { AccessTokenClaims } from '@Domain/auth/access-token';
import { JwtAccessTokenService } from './jwt-access-token.service';

describe('JwtAccessTokenService', () => {
  const jwtService = new JwtService({ secret: 'a-secret-with-at-least-32-characters!!' });
  const service = new JwtAccessTokenService(jwtService);

  const claims: AccessTokenClaims = {
    sub: '00000000-0000-4000-8000-000000000001',
    aud: AuthAudienceEnum.ADMIN,
    role: UserRoleEnum.PORTO_ANALYST,
    name: 'Analista Porto',
  };

  it('verifies the claims it issued', async () => {
    const token = await service.issue(claims);

    await expect(service.verify(token)).resolves.toEqual(expect.objectContaining(claims));
  });

  it('answers null for a token signed with another secret', async () => {
    const foreign = new JwtService({ secret: 'another-secret-with-32-characters!!!!' });

    await expect(service.verify(await foreign.signAsync(claims))).resolves.toBeNull();
  });

  it('answers null for an expired token', async () => {
    const expired = await jwtService.signAsync(claims, { expiresIn: '-1s' });

    await expect(service.verify(expired)).resolves.toBeNull();
  });

  it('answers null for an empty token', async () => {
    await expect(service.verify('')).resolves.toBeNull();
  });

  it('answers null for a token without the claims the api issues', async () => {
    const stranger = await jwtService.signAsync({ hello: 'world' });

    await expect(service.verify(stranger)).resolves.toBeNull();
  });
});

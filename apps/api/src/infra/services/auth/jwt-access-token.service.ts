import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenClaims,
  AccessTokenIssuer,
  AccessTokenVerifier,
} from '@Domain/auth/access-token';

/**
 * Um adapter, dois contratos. Quem emite é o use case de login; quem verifica é
 * o guard — e é por isso que os ports são separados: o guard não precisa da
 * capacidade de assinar um token, e não a recebe.
 */
@Injectable()
export class JwtAccessTokenService implements AccessTokenIssuer, AccessTokenVerifier {
  constructor(private readonly jwtService: JwtService) {}

  issue(claims: AccessTokenClaims): Promise<string> {
    return this.jwtService.signAsync(claims);
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync<Partial<AccessTokenClaims>>(token);

      // Token válido de outro emissor com o mesmo segredo não vira sessão: sem
      // `sub` e `aud` não há quem nem onde, e o guard não tem o que autorizar.
      if (!payload.sub || !payload.aud) return null;

      return {
        sub: payload.sub,
        aud: payload.aud,
        role: payload.role ?? null,
        name: payload.name ?? '',
      };
    } catch {
      // Assinatura inválida e token expirado são a mesma resposta para quem
      // chama; quem decide o status HTTP é o guard.
      return null;
    }
  }
}

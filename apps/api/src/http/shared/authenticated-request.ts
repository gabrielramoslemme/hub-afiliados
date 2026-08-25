import { Request } from 'express';
import { UserRoleEnum } from '@porto/contracts';
import { AccessTokenClaims } from '@Domain/auth/access-token';

/** Quem está decidindo, na forma que o use case precisa: `public_id` e perfil. */
export interface ActorInfo {
  publicId: string;
  name: string;
  role: UserRoleEnum | null;
}

/**
 * O `auth` é o que o `AuthenticatedGuard` verificou; o `actor` é o que o guard
 * do canal derivou dele. Os dois são opcionais no tipo porque a requisição
 * chega sem nenhum: quem os preenche são os guards, nessa ordem.
 */
export interface AuthenticatedRequest extends Request {
  auth?: AccessTokenClaims;
  actor?: ActorInfo;
}

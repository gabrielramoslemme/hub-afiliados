import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ActorInfo, AuthenticatedRequest } from '../authenticated-request';

/**
 * O ator sai do token verificado, nunca do corpo da requisição: quem decide não
 * pode ser quem o cliente disser que é.
 */
export const Actor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ActorInfo => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // O guard do canal publica o ator antes de qualquer handler rodar. Chegar
    // aqui sem ele é controller sem guard — erro de programação, não de quem
    // chamou.
    if (!request.actor) throw new UnauthorizedException('Sessão inválida. Entre novamente.');

    return request.actor;
  },
);

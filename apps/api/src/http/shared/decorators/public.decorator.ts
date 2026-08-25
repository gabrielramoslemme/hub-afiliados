import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/**
 * A ausência de token só é aceita onde alguém escreveu que é. O guard global
 * nega por omissão, então rota nova nasce protegida — inclusive a que o próximo
 * PR esquecer de proteger.
 */
export function Public(): CustomDecorator {
  return SetMetadata(IS_PUBLIC, true);
}

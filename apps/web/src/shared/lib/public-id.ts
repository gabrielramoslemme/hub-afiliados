import { z } from 'zod';

const publicIdSchema = z.uuid();

/**
 * O `public_id` entra no path da API, e quem o manda pode ser um POST montado à
 * mão para uma Server Action ou um endereço digitado no painel. Só uuid passa:
 * `../../affiliate/me/pix-key` levaria o servidor do Next a chamar outra rota
 * da API com o token da sessão.
 */
export function isPublicId(value: unknown): value is string {
  return publicIdSchema.safeParse(value).success;
}

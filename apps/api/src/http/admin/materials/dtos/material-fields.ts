import { Transform } from 'class-transformer';

/*
  Os campos que os dois formulários de materiais dividem, na mesma forma do
  schema de `@porto/contracts`: o schema é a autoridade do formulário, os DTOs
  são a autoridade da API.
*/

export function trim(): PropertyDecorator {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
}

/** Só https: o endereço vai para um `<iframe>`, um `<video>` ou um link numa página segura. */
export const HTTPS_URL = { protocols: ['https'], require_protocol: true };

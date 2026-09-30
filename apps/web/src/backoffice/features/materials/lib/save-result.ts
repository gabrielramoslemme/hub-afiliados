import type { z } from 'zod';

/** O que os actions dos materiais devolvem ao formulário. Nunca lançam para a UI. */
export type SaveMaterialResult<TField extends string> =
  | { status: 'success' }
  | { status: 'invalid'; fieldErrors: Partial<Record<TField, string>> }
  | { status: 'failed'; message: string };

/** A primeira mensagem de cada campo, que é a que o formulário mostra embaixo dele. */
export function fieldErrorsOf<TField extends string>(
  error: z.ZodError,
): Partial<Record<TField, string>> {
  const fieldErrors: Partial<Record<TField, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as TField | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }

  return fieldErrors;
}

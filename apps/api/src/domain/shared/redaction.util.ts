const REDACTED = '[removido]';

/**
 * Onze dígitos no molde do CPF, pontuação opcional — pega o fornecedor
 * devolvendo o número formatado (`529.982.247-25`) mesmo quando mandamos só
 * dígitos, sem depender de bater byte a byte com o que enviamos.
 */
const CPF_SHAPED = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;

/** Escapa o segredo para valer como texto literal na regex, não como padrão. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * O texto de um terceiro sem os segredos que ele pode citar: cada valor exato
 * conhecido — sem diferenciar caixa, a chave de e-mail pode voltar com outra —
 * e qualquer sequência que se pareça com um CPF.
 */
export function redactSensitive(
  text: string,
  secrets: ReadonlyArray<string | null | undefined> = [],
): string {
  const withoutSecrets = secrets.reduce<string>(
    (current, secret) =>
      secret ? current.replace(new RegExp(escapeForRegExp(secret), 'gi'), REDACTED) : current,
    text,
  );

  return withoutSecrets.replace(CPF_SHAPED, REDACTED);
}

/*
  O `@` é guardado sem o arroba: quem digita coloca ou não, e as duas formas
  precisam virar o mesmo registro. Caixa alta e baixa ficam como a pessoa
  digitou — o YouTube exibe o handle com a grafia escolhida.
*/
const SOCIAL_HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,30}$/;

export function sanitizeSocialHandle(value: string): string {
  return value.trim().replace(/^@+/, '');
}

export function isValidSocialHandle(value: string): boolean {
  return SOCIAL_HANDLE_PATTERN.test(sanitizeSocialHandle(value));
}

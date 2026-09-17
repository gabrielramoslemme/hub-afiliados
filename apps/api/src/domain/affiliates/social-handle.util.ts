/*
  O `@` é guardado sem o arroba: quem digita coloca ou não, e as duas formas
  precisam virar o mesmo registro. Caixa alta e baixa ficam como a pessoa
  digitou — o YouTube exibe o handle com a grafia escolhida.

  O formato aceito é validado no DTO de entrada, não aqui.
*/
export function sanitizeSocialHandle(value: string): string {
  return value.trim().replace(/^@+/, '');
}

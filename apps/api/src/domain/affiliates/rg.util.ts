/*
  O RG não tem formato nacional: cada estado emite o seu, o comprimento varia e
  há UF que usa letra como dígito verificador. Por isso a regra aqui é de forma,
  não de cálculo — validar dígito verificador de RG exigiria a tabela de cada
  emissor, e recusaria documento legítimo.
*/
const RG_PATTERN = /^[A-Z0-9]{5,20}$/;
const VISIBLE_CHARS = 4;

/** Só a pontuação de RG sai: engolir qualquer símbolo faria `12345678/SP` virar
    o RG `12345678SP`, mudando o documento em vez de recusar o que foi digitado. */
export function sanitizeRg(value: string): string {
  return value.replace(/[.\-\s]/g, '').toUpperCase();
}

export function isValidRg(value: string): boolean {
  return RG_PATTERN.test(sanitizeRg(value));
}

/** Máscara para a conta do afiliado: preserva só os quatro últimos caracteres. */
export function maskRg(value: string): string {
  const rg = sanitizeRg(value);
  if (!isValidRg(rg)) return '*'.repeat(5);

  return `${'*'.repeat(rg.length - VISIBLE_CHARS)}${rg.slice(-VISIBLE_CHARS)}`;
}

/*
  O cupom é digitado por um cliente final no checkout, não copiado de um sistema:
  por isso a regra é mais estreita do que os 200 caracteres que a Porto aceita.
  Só maiúscula e dígito — acento e pontuação sobrevivem mal a um teclado de
  celular e a um cupom ditado em vídeo.
*/
const COUPON_CODE_PATTERN = /^[A-Z0-9]{4,20}$/;

/**
 * Só apara as pontas e sobe a caixa. Espaço no meio é preservado de propósito:
 * engolir faria `MARINA 25` virar o cupom `MARINA25`, emitindo um código que
 * ninguém pediu em vez de recusar o que foi digitado.
 */
export function sanitizeCouponCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidCouponCode(value: string): boolean {
  return COUPON_CODE_PATTERN.test(sanitizeCouponCode(value));
}

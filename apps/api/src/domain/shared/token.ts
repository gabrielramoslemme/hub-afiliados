declare const contract: unique symbol;

/**
 * Identidade em runtime de um contrato do núcleo. O `TContract` é fantasma —
 * existe só para o compilador e não sobra nada dele no JavaScript, onde o token
 * continua sendo um `Symbol` comum. É o que permite ao wiring cobrar que cada
 * token case com o parâmetro que ele preenche, em vez de aceitar `symbol`.
 */
export type Token<TContract> = symbol & { readonly [contract]?: TContract };

export function createToken<TContract extends object>(description: string): Token<TContract> {
  return Symbol(description) as Token<TContract>;
}

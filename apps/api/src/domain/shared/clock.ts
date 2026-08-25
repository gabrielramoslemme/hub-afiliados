import { createToken } from '@Domain/shared/token';

export const CLOCK = createToken<Clock>('CLOCK');

/**
 * O relógio é dependência externa como qualquer outra. Não é preciosismo de
 * teste: o instante da aprovação e o vencimento do token de uso único são
 * decisão de regra, e `new Date()` dentro do use case torna a asserção
 * impossível sem congelar o relógio global do Jest.
 */
export interface Clock {
  now(): Date;
}

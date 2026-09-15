import { CouponStatusEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';

export const COUPON_GATEWAY = createToken<CouponGateway>('COUPON_GATEWAY');

export interface IssueCouponInput {
  /** Já normalizado por `sanitizeCouponCode`. */
  code: string;
  discountPercent: number;
}

export interface ChangeCouponInput {
  /** Já normalizado por `sanitizeCouponCode`. */
  code: string;
  /** Ao menos um dos dois vem preenchido — o use case recusa a mudança vazia. */
  discountPercent?: number;
  status?: CouponStatusEnum;
}

export interface CouponAvailability {
  available: boolean;
  /** Texto de tela quando o código está ocupado; nulo quando está livre. */
  reason: string | null;
}

/**
 * O que a regra precisa de quem registra os cupons nos canais de venda, no
 * nosso vocabulário. O cupom é criado e gerenciado aqui; quem hoje o registra é
 * a Porto Serviços, pelo INT-01 — mas `codigoCupom`, `percentualDesconto` e
 * `flagCupomCumulativo` não atravessam este contrato: eles vivem inteiros em
 * `infra/services/coupons/`, e é isso que permite trocar o fornecedor sem tocar
 * um arquivo de regra.
 *
 * `issue` e `change` não devolvem cupom: o que vale é o que a analista decidiu,
 * e o fornecedor só confirma que registrou. A resposta dele nunca vira dado.
 *
 * Todas as operações lançam `CouponProviderUnavailableError` quando o
 * fornecedor não responde — a diferença entre "não deu" e "o código está
 * ocupado" é o que decide se a analista tenta de novo ou muda o código.
 */
export interface CouponGateway {
  checkAvailability(code: string): Promise<CouponAvailability>;
  /** Registra o cupom recém-criado; resolve quando o fornecedor confirmou. */
  issue(input: IssueCouponInput): Promise<void>;
  /**
   * Registra a mudança de percentual, de status, ou dos dois. Lança
   * `CouponNotFoundError` quando o cupom não está registrado lá — desencontro
   * entre o nosso cupom e o registro deles, que repetir não resolve.
   */
  change(input: ChangeCouponInput): Promise<void>;
}

import { z } from 'zod';
import { CouponStatusEnum } from '../enums';

/** O cupom como o painel e a área do afiliado o mostram. */
export interface CouponSummary {
  code: string;
  discountPercent: number;
  status: CouponStatusEnum;
}

/**
 * Resposta da checagem que o diálogo de aprovação faz enquanto a analista
 * digita. O `reason` só vem quando o código está ocupado, e é texto de tela.
 */
export interface CouponAvailabilityResponse {
  code: string;
  available: boolean;
  reason: string | null;
}

/**
 * Um registro da trilha do cupom. O painel o mostra junto da trilha do
 * cadastro, porque para quem audita a aprovação e o cupom são a mesma história.
 */
export interface CouponHistoryItem {
  /** Nulo na emissão, que é o primeiro registro. */
  fromStatus: CouponStatusEnum | null;
  toStatus: CouponStatusEnum;
  fromDiscountPercent: number | null;
  toDiscountPercent: number;
  actorName: string | null;
  createdAt: string;
}

/*
  Alterar o cupom é operação do painel, e o INT-01 aceita os dois campos soltos:
  o corpo precisa trazer ao menos um. O `refine` é o que impede um PATCH vazio
  chegar à Porto — uma volta de rede que não mudaria nada.
*/
export const changeCouponSchema = z
  .object({
    status: z.nativeEnum(CouponStatusEnum).optional(),
    // `coerce` porque o `input[type=number]` do painel entrega string.
    discountPercent: z.coerce
      .number({ message: 'Informe o percentual de desconto' })
      .int('O percentual deve ser um número inteiro')
      .min(1, 'O desconto começa em 1%')
      .max(25, 'O desconto vai até 25%')
      .optional(),
  })
  .refine((value) => value.status !== undefined || value.discountPercent !== undefined, {
    message: 'Altere o status ou o percentual de desconto.',
  });

export type ChangeCouponRequest = z.infer<typeof changeCouponSchema>;

/** O que o formulário guarda antes do `coerce`; `ChangeCouponRequest` é o depois. */
export type ChangeCouponFormValues = z.input<typeof changeCouponSchema>;

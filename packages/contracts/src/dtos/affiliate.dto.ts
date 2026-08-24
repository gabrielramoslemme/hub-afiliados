import { z } from 'zod';
import type { AffiliateStatusEnum, StatementEntryKindEnum } from '../enums';
import { PixKeyTypeEnum } from '../enums';

/** Item da fila de aprovação. CPF já vem mascarado da API. */
export interface AffiliateListItem {
  publicId: string;
  name: string;
  email: string;
  maskedCpf: string;
  status: AffiliateStatusEnum;
  createdAt: string;
}

export interface AffiliateDetail extends AffiliateListItem {
  cpf: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectionReason: string | null;
}

export interface AffiliateStatusHistoryItem {
  fromStatus: AffiliateStatusEnum | null;
  toStatus: AffiliateStatusEnum;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

/*
  O que a própria pessoa vê da sua conta. Diferente do `AffiliateDetail`, que é
  a visão da analista: aqui não há `approvedByName` nem `rejectionReason` de
  outra pessoa, e o CPF chega mascarado — o afiliado já sabe o dele, e um CPF
  completo numa tela aberta em público não serve a ninguém.
*/
export interface AffiliateMeResponse {
  publicId: string;
  name: string;
  email: string;
  maskedCpf: string;
  pixKeyType: PixKeyTypeEnum;
  maskedPixKey: string;
  status: AffiliateStatusEnum;
  /** Nulo enquanto a Porto não emitir o cupom do afiliado aprovado. */
  coupon: string | null;
  createdAt: string;
}

export interface AffiliateStatementEntry {
  id: string;
  kind: StatementEntryKindEnum;
  title: string;
  detail: string;
  /** Centavos, sempre positivo. O sinal quem dá é o `kind`. */
  cents: number;
  occurredAt: string;
}

export interface AffiliateWalletResponse {
  /** Centavos. Dinheiro em ponto flutuante acumula erro na soma. */
  balanceCents: number;
  /** Total já pago via PIX, em centavos. */
  paidCents: number;
  updatedAt: string;
  entries: AffiliateStatementEntry[];
}

export const rejectAffiliateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Descreva o motivo com ao menos 10 caracteres')
    .max(500, 'O motivo deve ter no máximo 500 caracteres'),
});

export type RejectAffiliateRequest = z.infer<typeof rejectAffiliateSchema>;

/**
 * Cadastro público do afiliado, espelhando `CreateAffiliateRequestDto` da API.
 * O DTO de lá continua sendo a autoridade: este schema existe para o formulário
 * recusar antes de enviar o que a API recusaria depois.
 *
 * O que **não** entra aqui: dígito verificador do CPF, que a API valida com
 * `cpf-cnpj-validator`. Reimplementar o cálculo criaria uma segunda fonte da
 * mesma regra; o `INVALID_CPF` da resposta vira erro no campo do CPF.
 */
const FULL_NAME_PATTERN = /^\S+(\s+\S+)+$/;
const PIX_PHONE_PATTERN = /^\d{10,13}$/;
const CPF_LENGTH = 11;

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

export const createAffiliateSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Informe o nome completo.')
      .max(255, 'O nome deve ter no máximo 255 caracteres.')
      .regex(FULL_NAME_PATTERN, 'Informe o nome e o sobrenome.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Informe um e-mail válido.')
      .max(255, 'O e-mail deve ter no máximo 255 caracteres.')
      .refine((value) => z.email().safeParse(value).success, 'Informe um e-mail válido.'),
    cpf: z
      .string()
      .trim()
      .refine((value) => digitsOf(value).length === CPF_LENGTH, 'Informe um CPF válido.'),
    pixKeyType: z.enum(PixKeyTypeEnum, { message: 'Escolha o tipo da chave PIX.' }),
    pixKey: z
      .string()
      .trim()
      .min(1, 'Informe a chave PIX.')
      .max(140, 'A chave PIX deve ter no máximo 140 caracteres.'),
  })
  .superRefine((input, ctx) => {
    const reject = (message: string) => ctx.addIssue({ code: 'custom', path: ['pixKey'], message });

    if (input.pixKeyType === PixKeyTypeEnum.EMAIL) {
      if (!z.email().safeParse(input.pixKey.toLowerCase()).success) {
        reject('Informe um e-mail válido como chave PIX.');
      }
      return;
    }

    if (input.pixKeyType === PixKeyTypeEnum.PHONE) {
      if (!PIX_PHONE_PATTERN.test(digitsOf(input.pixKey))) {
        reject('Informe um telefone válido como chave PIX.');
      }
      return;
    }

    // A chave do tipo CPF é a única verificação de titularidade possível sem
    // consultar terceiros: ela tem que ser o CPF de quem está se cadastrando.
    if (digitsOf(input.pixKey) !== digitsOf(input.cpf)) {
      reject('A chave PIX do tipo CPF precisa ser igual ao CPF informado.');
    }
  });

export type CreateAffiliateRequest = z.infer<typeof createAffiliateSchema>;

export interface CreateAffiliateResponse {
  publicId: string;
  status: AffiliateStatusEnum;
}

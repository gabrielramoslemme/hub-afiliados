import { z } from 'zod';
import { AffiliateStatusEnum, PixKeyTypeEnum } from '../enums';

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
  termsVersion: string;
  termsAcceptedAt: string;
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

export const rejectAffiliateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Descreva o motivo com ao menos 10 caracteres')
    .max(500, 'O motivo deve ter no máximo 500 caracteres'),
});

export type RejectAffiliateRequest = z.infer<typeof rejectAffiliateSchema>;

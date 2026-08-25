import { AffiliateStatusEnum } from '@porto/contracts';
import {
  AffiliateRepository,
  AffiliateSortBy,
  AffiliateSortOrder,
} from '@Domain/affiliates/affiliate.repository';
import { maskCpf } from '@Domain/affiliates/cpf.util';
import { UseCase } from '../use-case';

export interface ListAffiliatesInput {
  page: number;
  limit: number;
  status: AffiliateStatusEnum | null;
  search: string | null;
  sortBy: AffiliateSortBy;
  sortOrder: AffiliateSortOrder;
}

/**
 * Carrega `maskedCpf` e **não** carrega `cpf`. Mascarar na camada HTTP deixaria
 * o CPF completo dentro do objeto que a application entrega, e um log de
 * depuração no controller vazaria a listagem inteira.
 */
export interface AffiliateListItemOutput {
  publicId: string;
  name: string;
  email: string;
  maskedCpf: string;
  status: AffiliateStatusEnum;
  createdAt: Date;
}

export interface ListAffiliatesOutput {
  data: AffiliateListItemOutput[];
  total: number;
  page: number;
  limit: number;
}

export class ListAffiliatesUseCase implements UseCase<ListAffiliatesInput, ListAffiliatesOutput> {
  constructor(private readonly affiliateRepository: AffiliateRepository) {}

  async execute(input: ListAffiliatesInput): Promise<ListAffiliatesOutput> {
    const { rows, total } = await this.affiliateRepository.search(input);

    return {
      data: rows.map((affiliate) => ({
        publicId: affiliate.publicId,
        name: affiliate.user.name,
        email: affiliate.user.email,
        maskedCpf: maskCpf(affiliate.cpf),
        status: affiliate.status,
        createdAt: affiliate.createdAt,
      })),
      total,
      page: input.page,
      limit: input.limit,
    };
  }
}

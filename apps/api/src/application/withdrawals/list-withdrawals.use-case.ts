import { WithdrawalStatusEnum } from '@porto/contracts';
import { maskCpf } from '@Domain/affiliates/cpf.util';
import { WithdrawalWithAffiliate } from '@Domain/withdrawals/withdrawal.entity';
import {
  SearchWithdrawalsInput,
  WithdrawalRepository,
} from '@Domain/withdrawals/withdrawal.repository';
import { UseCase } from '../use-case';

export interface WithdrawalListItemOutput {
  publicId: string;
  affiliatePublicId: string;
  affiliateName: string;
  maskedCpf: string;
  amountCents: number;
  status: WithdrawalStatusEnum;
  requestedAt: Date;
  paidAt: Date | null;
}

export interface ListWithdrawalsOutput {
  data: WithdrawalListItemOutput[];
  total: number;
  page: number;
  limit: number;
}

export function toWithdrawalListItem(
  withdrawal: WithdrawalWithAffiliate,
): WithdrawalListItemOutput {
  return {
    publicId: withdrawal.publicId,
    affiliatePublicId: withdrawal.affiliate.publicId,
    affiliateName: withdrawal.affiliate.name,
    // Em listagem, o CPF sai mascarado sempre.
    maskedCpf: maskCpf(withdrawal.affiliate.cpf),
    amountCents: withdrawal.amountCents,
    status: withdrawal.status,
    requestedAt: withdrawal.requestedAt,
    paidAt: withdrawal.paidAt,
  };
}

/** Os saques de todos os afiliados, para a Porto e a Mesa conferirem. Só leitura. */
export class ListWithdrawalsUseCase
  implements UseCase<SearchWithdrawalsInput, ListWithdrawalsOutput>
{
  constructor(private readonly withdrawalRepository: WithdrawalRepository) {}

  async execute(input: SearchWithdrawalsInput): Promise<ListWithdrawalsOutput> {
    const result = await this.withdrawalRepository.search(input);

    return { ...result, data: result.data.map(toWithdrawalListItem) };
  }
}

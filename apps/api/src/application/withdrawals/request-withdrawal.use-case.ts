import { WithdrawalStatusEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { PayoutGateway } from '@Domain/withdrawals/payout-gateway';
import { WithdrawalRepository } from '@Domain/withdrawals/withdrawal.repository';
import {
  BalanceChangedError,
  NoBalanceToWithdrawError,
  PayoutProviderAccessDeniedError,
  PayoutProviderUnavailableError,
  PayoutRefusedError,
  PayoutsDisabledError,
} from '@Domain/withdrawals/withdrawals.errors';
import { UseCase } from '../use-case';
import { refusalUpdate } from './payout-refusal';

export interface RequestWithdrawalInput {
  userPublicId: string;
  /** O saldo que a pessoa viu e confirmou. Nulo: saca o que houver. */
  expectedCents: number | null;
}

export interface RequestWithdrawalOutput {
  publicId: string;
  status: WithdrawalStatusEnum;
  amountCents: number;
  requestedAt: Date;
}

/**
 * O afiliado saca o saldo inteiro via PIX.
 *
 * A ordem é a regra: primeiro o saque é gravado, com as vendas reservadas;
 * só depois o fornecedor é chamado. O contrário — a referência fazia assim —
 * paga duas vezes quando a gravação falha depois de o PIX ter saído.
 *
 * Sem resposta do fornecedor, o saque fica `REQUESTED` e sai do saldo mesmo
 * assim: não se sabe se o PIX foi, e a reconciliação repete o pedido com a
 * mesma referência, que ele não paga duas vezes.
 */
export class RequestWithdrawalUseCase
  implements UseCase<RequestWithdrawalInput, RequestWithdrawalOutput>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly payoutGateway: PayoutGateway,
    private readonly clock: Clock,
  ) {}

  async execute({
    userPublicId,
    expectedCents,
  }: RequestWithdrawalInput): Promise<RequestWithdrawalOutput> {
    if (!this.payoutGateway.isEnabled()) throw new PayoutsDisabledError();

    const user = await this.userRepository.findByPublicId(userPublicId);
    if (!user?.affiliate) throw new UnknownAffiliateError();

    const { affiliate } = user;
    if (!affiliate.coupon) throw new NoBalanceToWithdrawError();

    const now = this.clock.now();
    const { withdrawal, availableCents } = await this.withdrawalRepository.reserve({
      affiliateId: affiliate.id,
      couponId: affiliate.coupon.id,
      pixKeyType: affiliate.pixKeyType,
      pixKey: affiliate.pixKey,
      expectedCents,
      requestedAt: now,
    });
    if (!withdrawal) {
      throw availableCents === 0 ? new NoBalanceToWithdrawError() : new BalanceChangedError();
    }

    const output = {
      publicId: withdrawal.publicId,
      amountCents: withdrawal.amountCents,
      requestedAt: withdrawal.requestedAt,
    };

    try {
      const { batchId } = await this.payoutGateway.requestPayout({
        reference: withdrawal.publicId,
        amountCents: withdrawal.amountCents,
        pixKeyType: withdrawal.pixKeyType,
        pixKey: withdrawal.pixKey,
        holderCpf: affiliate.cpf,
      });
      await this.withdrawalRepository.markProcessing(withdrawal.publicId, batchId);

      return { ...output, status: WithdrawalStatusEnum.PROCESSING };
    } catch (error) {
      if (error instanceof PayoutRefusedError) {
        await this.withdrawalRepository.applyPayoutUpdate({
          update: refusalUpdate(withdrawal.publicId, error.reason),
          at: now,
          event: null,
        });
        throw error;
      }

      if (
        error instanceof PayoutProviderUnavailableError ||
        error instanceof PayoutProviderAccessDeniedError
      ) {
        return { ...output, status: WithdrawalStatusEnum.REQUESTED };
      }

      throw error;
    }
  }
}

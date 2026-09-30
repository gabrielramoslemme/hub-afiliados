import {
  PayoutEventOutcomeEnum,
  PayoutEventSourceEnum,
  PixKeyTypeEnum,
  WithdrawalStatusEnum,
} from '@porto/contracts';
import { createToken } from '@Domain/shared/token';
import { PayoutUpdate } from './payout-gateway';
import { WithdrawalEntity, WithdrawalWithAffiliate } from './withdrawal.entity';

export const WITHDRAWAL_REPOSITORY = createToken<WithdrawalRepository>('WITHDRAWAL_REPOSITORY');

export interface ReserveWithdrawalInput {
  affiliateId: number;
  couponId: number;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  /** O saldo que a pessoa confirmou. Nulo: saca o que houver. */
  expectedCents: number | null;
  requestedAt: Date;
}

export interface ReserveWithdrawalResult {
  /** Nulo quando nada foi reservado: sem saldo, ou saldo diferente do esperado. */
  withdrawal: WithdrawalEntity | null;
  /** O saldo encontrado debaixo do lock. */
  availableCents: number;
}

export interface RecordPayoutEventInput {
  source: PayoutEventSourceEnum;
  eventId: string | null;
  receivedAt: Date;
}

export interface ApplyPayoutUpdateInput {
  update: PayoutUpdate;
  /** O instante gravado em `paidAt`, `failedAt` ou `returnedAt`. */
  at: Date;
  /** Nulo quando a mudança não veio do fornecedor — a recusa na hora do pedido. */
  event: RecordPayoutEventInput | null;
}

export interface ApplyPayoutUpdateResult {
  outcome: PayoutEventOutcomeEnum;
  /** Nulo quando a referência não é de saque nenhum. */
  withdrawal: WithdrawalWithAffiliate | null;
}

export interface ListStaleWithdrawalsInput {
  status: WithdrawalStatusEnum.REQUESTED | WithdrawalStatusEnum.PROCESSING;
  /** Só os que não mudam desde antes deste instante. */
  updatedBefore: Date;
  limit: number;
}

export interface SearchWithdrawalsInput {
  page: number;
  limit: number;
  status: WithdrawalStatusEnum | null;
  /** Nome do afiliado, ou CPF com 11 dígitos. */
  search: string | null;
  requestedFrom: Date | null;
  /** Exclusivo. */
  requestedUntil: Date | null;
}

export interface SearchWithdrawalsResult {
  data: WithdrawalWithAffiliate[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Os saques e a reserva das vendas que eles pagam. Toda escrita que mexe no
 * saldo — reservar, falhar, devolver — trava as linhas no adapter: é o banco
 * que decide a corrida, porque a leitura do use case não segura nada.
 */
export interface WithdrawalRepository {
  /**
   * Trava as vendas liberadas e livres do cupom, cria o saque `REQUESTED` com
   * a soma delas e as aponta para ele, numa transação só. Não reserva nada sem
   * saldo, nem quando a soma não é a esperada.
   */
  reserve(input: ReserveWithdrawalInput): Promise<ReserveWithdrawalResult>;
  /**
   * `REQUESTED` → `PROCESSING`, guardando o lote quando ele veio. Não mexe no
   * saque que o webhook já levou adiante: só completa o lote que faltava.
   */
  markProcessing(reference: string, batchId: string | null): Promise<void>;
  /**
   * Toca `updatedAt` do saque que ainda está em `status` e diz se tocou. Falso
   * quando ele mudou desde a leitura — quem chamou não deve mais agir sobre ele.
   */
  claimForAttempt(
    publicId: string,
    status: WithdrawalStatusEnum.REQUESTED | WithdrawalStatusEnum.PROCESSING,
  ): Promise<boolean>;
  /**
   * Aplica o desfecho ao saque travado, pela regra de `resolvePayoutTransition`.
   * Falha e devolução soltam as vendas na mesma transação, e o evento, quando
   * há, vai para a trilha com o desfecho.
   */
  applyPayoutUpdate(input: ApplyPayoutUpdateInput): Promise<ApplyPayoutUpdateResult>;
  /** Todos os saques do afiliado, do mais recente para o mais antigo. */
  listByAffiliate(affiliateId: number): Promise<WithdrawalEntity[]>;
  /** Do mais antigo para o mais novo. `PROCESSING` só entra com lote conhecido. */
  listStale(input: ListStaleWithdrawalsInput): Promise<WithdrawalWithAffiliate[]>;
  search(input: SearchWithdrawalsInput): Promise<SearchWithdrawalsResult>;
  findByPublicId(publicId: string): Promise<WithdrawalWithAffiliate | null>;
}

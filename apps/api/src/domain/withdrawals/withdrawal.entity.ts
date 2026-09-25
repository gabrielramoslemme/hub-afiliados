import { PixKeyTypeEnum, WithdrawalStatusEnum } from '@porto/contracts';

/**
 * Um saque via PIX do saldo inteiro do afiliado. A chave é copiada no pedido:
 * trocá-la no perfil depois não desvia um saque que já saiu.
 *
 * `provider*` é o que o fornecedor de pagamento devolve. O nome do fornecedor
 * não entra aqui — trocá-lo não pode tocar arquivo de regra.
 */
export interface WithdrawalEntity {
  id: number;
  publicId: string;
  affiliateId: number;
  /** Em centavos. É a soma dos incentivos das vendas que o saque reservou. */
  amountCents: number;
  status: WithdrawalStatusEnum;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  /** O lote do fornecedor; nulo até ele aceitar, ou quando ele só confirmou uma repetição. */
  providerBatchId: string | null;
  providerTransferId: string | null;
  /** O identificador do PIX no Banco Central, para conciliar com o extrato do banco. */
  endToEndId: string | null;
  receiptUrl: string | null;
  failureReason: string | null;
  requestedAt: Date;
  paidAt: Date | null;
  failedAt: Date | null;
  returnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Quem pediu o saque: o que o e-mail, o painel e o fornecedor precisam saber. */
export interface WithdrawalAffiliate {
  publicId: string;
  name: string;
  email: string;
  /** Só dígitos. Vai ao fornecedor para ele conferir a titularidade da chave. */
  cpf: string;
}

export interface WithdrawalWithAffiliate extends WithdrawalEntity {
  affiliate: WithdrawalAffiliate;
}

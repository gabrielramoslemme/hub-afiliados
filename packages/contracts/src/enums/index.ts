export enum UserTypeEnum {
  AFFILIATE = 'AFFILIATE',
  ADMIN = 'ADMIN',
}

export enum UserRoleEnum {
  PORTO_ANALYST = 'PORTO_ANALYST',
  PORTO_ADMIN = 'PORTO_ADMIN',
  MESA_ADMIN = 'MESA_ADMIN',
}

export enum AffiliateStatusEnum {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Situação do cupom do afiliado, decidida no painel. A Porto chama os mesmos
 * estados de `ATIVO` e `INATIVO`; a tradução mora no adapter, em
 * `infra/services/coupons/`.
 */
export enum CouponStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum PixKeyTypeEnum {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  CPF = 'CPF',
}

/** Onde o afiliado divulga o cupom. Opcional no cadastro, sempre com o `@`. */
export enum SocialNetworkEnum {
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  FACEBOOK = 'FACEBOOK',
  X = 'X',
  KWAI = 'KWAI',
}

/**
 * O que o afiliado faz, na lista que a Porto definiu. Obrigatória no cadastro e
 * trocada só pelo próprio afiliado, no perfil.
 */
export enum OccupationEnum {
  REAL_ESTATE_PROFESSIONAL = 'REAL_ESTATE_PROFESSIONAL',
  CONDOMINIUM_PROFESSIONAL = 'CONDOMINIUM_PROFESSIONAL',
  INFLUENCER = 'INFLUENCER',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
  PROMOTION_SHARING = 'PROMOTION_SHARING',
}

export enum TokenPurposeEnum {
  SET_PASSWORD = 'SET_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export enum AuthAudienceEnum {
  AFFILIATE = 'affiliate',
  ADMIN = 'admin',
}

export enum AuthErrorCodeEnum {
  INVALID_CREDENTIALS = 'AUTH-001',
  REGISTRATION_UNDER_REVIEW = 'AUTH-002',
  REGISTRATION_REJECTED = 'AUTH-003',
  PASSWORD_NOT_SET = 'AUTH-004',
  ACCOUNT_INACTIVE = 'AUTH-005',
  /** Link de definir senha usado, vencido ou adulterado — a tela oferece um novo. */
  INVALID_TOKEN = 'AUTH-006',
  /** Senha atual errada na confirmação de uma troca sensível, como a da chave PIX ou do e-mail. */
  WRONG_PASSWORD = 'AUTH-007',
}

/** O que uma linha do extrato do afiliado é: entrada de incentivo ou pagamento. */
export enum StatementEntryKindEnum {
  INCENTIVE = 'INCENTIVE',
  PAYOUT = 'PAYOUT',
}

/** Em que pé está uma venda feita com o cupom do afiliado. */
export enum ReferralStatusEnum {
  /** O cliente contratou e o serviço ainda não foi concluído: o incentivo espera. */
  PENDING = 'PENDING',
  /** Serviço concluído: o incentivo está confirmado e entrou no extrato. */
  COMPLETED = 'COMPLETED',
  /**
   * O serviço não foi concluído, e a venda não rende incentivo. Continua na lista
   * para a pessoa entender por que um pendente não virou dinheiro.
   */
  CANCELED = 'CANCELED',
}

/**
 * O incentivo de uma venda feita com o cupom do afiliado, como a Porto Serviços
 * decidiu e nos notificou. Pendente e liberado viram entrada no extrato; cancelado
 * encerra a venda sem comissão.
 */
export enum IncentiveStatusEnum {
  /** Venda registrada, serviço ainda não executado. */
  PENDING = 'PENDING',
  /** Serviço concluído: o incentivo pode ser pago. */
  RELEASED = 'RELEASED',
  /** Venda não concluída: não há incentivo. */
  CANCELED = 'CANCELED',
}

/** O recorte da lista de indicações na tela inicial do afiliado. */
export enum ReferralPeriodEnum {
  LAST_30_DAYS = 'LAST_30_DAYS',
  /** O ano corrente, de 1º de janeiro até hoje. */
  YEAR = 'YEAR',
  ALL = 'ALL',
}

/**
 * De que registro é uma linha de `audit_logs`. A tabela é global, e o par
 * `entity` + `entity_id` é o que diz a quem a alteração pertence.
 */
export enum AuditEntityEnum {
  AFFILIATE = 'AFFILIATE',
  COUPON = 'COUPON',
}

/** O que aconteceu com o registro auditado. */
export enum AuditChangeTypeEnum {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}

export enum MailTemplateEnum {
  REGISTRATION_RECEIVED = 'REGISTRATION_RECEIVED',
  REGISTRATION_APPROVED = 'REGISTRATION_APPROVED',
  REGISTRATION_REJECTED = 'REGISTRATION_REJECTED',
  PASSWORD_RECOVERY = 'PASSWORD_RECOVERY',
  PIX_KEY_CHANGED = 'PIX_KEY_CHANGED',
  EMAIL_CHANGED = 'EMAIL_CHANGED',
  WITHDRAWAL_PAID = 'WITHDRAWAL_PAID',
  WITHDRAWAL_RETURNED = 'WITHDRAWAL_RETURNED',
}

export enum RegistrationErrorCodeEnum {
  INVALID_CPF = 'REG-001',
  EMAIL_ALREADY_REGISTERED = 'REG-002',
  CPF_ALREADY_REGISTERED = 'REG-003',
  PIX_KEY_MISMATCH = 'REG-004',
  PIX_KEY_INVALID = 'REG-005',
  RG_ALREADY_REGISTERED = 'REG-006',
  INVALID_RG = 'REG-007',
  TERMS_NOT_ACCEPTED = 'REG-008',
}

/** Falhas da emissão do cupom, que o painel distingue para escolher a mensagem. */
export enum CouponErrorCodeEnum {
  CODE_UNAVAILABLE = 'CPN-001',
  /** A Porto Serviços não respondeu — a analista pode tentar de novo. */
  PROVIDER_UNAVAILABLE = 'CPN-002',
  /** A Porto Serviços recusou os dados — repetir não resolve, a analista muda o pedido. */
  REFUSED = 'CPN-003',
  /**
   * A Porto Serviços recusou a credencial da integração — repetir não resolve, e
   * quem corrige é quem configura o ambiente, não a analista.
   */
  PROVIDER_ACCESS_DENIED = 'CPN-004',
}

/**
 * Recusas do webhook de incentivos. Quem lê é o suporte da Porto Serviços, que
 * decide pelo código se reprocessa, corrige o envio ou abre um chamado.
 */
export enum IncentiveErrorCodeEnum {
  /** O cupom da venda não é de nenhum afiliado. */
  UNKNOWN_COUPON = 'INC-001',
  /** Conclusão ou cancelamento de uma venda que nunca foi registrada aqui. */
  SALE_NOT_REGISTERED = 'INC-002',
  /** A venda já foi encerrada com o desfecho oposto, e venda encerrada não reabre. */
  SALE_ALREADY_SETTLED = 'INC-003',
  /** O tipo do evento e o status do incentivo não formam um par válido. */
  INCONSISTENT_EVENT = 'INC-004',
  /** A venda já existe aqui com outro cupom. */
  SALE_COUPON_MISMATCH = 'INC-005',
  /** O corpo está fora do contrato; a mensagem lista os campos. */
  INVALID_PAYLOAD = 'INC-006',
}

/** Onde está um saque via PIX. `FAILED` e `RETURNED` devolvem o valor ao saldo. */
export enum WithdrawalStatusEnum {
  /** Gravado aqui; ainda não se sabe se o fornecedor de pagamento recebeu. */
  REQUESTED = 'REQUESTED',
  /** Aceito pelo fornecedor, esperando o PIX cair. */
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  /** O banco de destino devolveu o PIX — inclusive depois de pago. */
  RETURNED = 'RETURNED',
}

export enum WithdrawalErrorCodeEnum {
  NO_BALANCE = 'WDR-001',
  /** O fornecedor recusou o PIX, em geral pela chave. O valor já voltou ao saldo. */
  REFUSED = 'WDR-002',
  /** O saque está desligado neste ambiente: a integração não tem credencial. */
  UNAVAILABLE = 'WDR-003',
}

/** O que uma notificação ou consulta do fornecedor fez com o saque. */
export enum PayoutEventOutcomeEnum {
  APPLIED = 'APPLIED',
  DUPLICATE = 'DUPLICATE',
  IGNORED = 'IGNORED',
  UNKNOWN_WITHDRAWAL = 'UNKNOWN_WITHDRAWAL',
  /**
   * Pago ou devolvido chegando num saque já falho: as vendas dele voltaram ao
   * saldo e podem estar em outro saque. Nada muda; alguém precisa conferir.
   */
  DIVERGENT = 'DIVERGENT',
}

/** De onde veio a mudança: o webhook do fornecedor ou a reconciliação agendada. */
export enum PayoutEventSourceEnum {
  WEBHOOK = 'WEBHOOK',
  RECONCILIATION = 'RECONCILIATION',
}

/** Todo `code` que o corpo de erro da API pode carregar. */
export type ApiErrorCode =
  | AuthErrorCodeEnum
  | RegistrationErrorCodeEnum
  | CouponErrorCodeEnum
  | IncentiveErrorCodeEnum
  | WithdrawalErrorCodeEnum;

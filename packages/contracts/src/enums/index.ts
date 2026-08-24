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
  SUSPENDED = 'SUSPENDED',
}

export enum PixKeyTypeEnum {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  CPF = 'CPF',
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
}

/** O que uma linha do extrato do afiliado é: entrada de incentivo ou pagamento. */
export enum StatementEntryKindEnum {
  INCENTIVE = 'INCENTIVE',
  PAYOUT = 'PAYOUT',
}

export enum MailTemplateEnum {
  REGISTRATION_RECEIVED = 'REGISTRATION_RECEIVED',
  REGISTRATION_APPROVED = 'REGISTRATION_APPROVED',
  REGISTRATION_REJECTED = 'REGISTRATION_REJECTED',
  PASSWORD_RECOVERY = 'PASSWORD_RECOVERY',
}

export enum RegistrationErrorCodeEnum {
  INVALID_CPF = 'REG-001',
  EMAIL_ALREADY_REGISTERED = 'REG-002',
  CPF_ALREADY_REGISTERED = 'REG-003',
  PIX_KEY_MISMATCH = 'REG-004',
  PIX_KEY_INVALID = 'REG-005',
}

/** Todo `code` que o corpo de erro da API pode carregar. */
export type ApiErrorCode = AuthErrorCodeEnum | RegistrationErrorCodeEnum;

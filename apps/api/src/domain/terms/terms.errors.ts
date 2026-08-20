import { RegistrationErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

export class TermsNotPublishedError extends DomainError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;
  readonly code = RegistrationErrorCodeEnum.TERMS_NOT_PUBLISHED;

  constructor() {
    super('Nenhuma versão dos termos está publicada.');
  }
}

import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';

export class TrainingModuleNotFoundError extends DomainError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;

  constructor() {
    super('Módulo da trilha não encontrado.');
  }
}

export class PromotionalMaterialNotFoundError extends DomainError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;

  constructor() {
    super('Material de divulgação não encontrado.');
  }
}

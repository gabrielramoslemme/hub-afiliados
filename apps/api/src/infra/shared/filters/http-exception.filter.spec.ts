import {
  type ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AuthErrorCodeEnum } from '@porto/contracts';
import { DomainError, DomainErrorKindEnum } from '@Domain/errors/domain.error';
import { HttpExceptionFilter } from './http-exception.filter';

class AffiliateNotFoundError extends DomainError {
  readonly kind = DomainErrorKindEnum.NOT_FOUND;

  constructor() {
    super('Afiliado não encontrado.');
  }
}

class RegistrationUnderReviewError extends DomainError {
  readonly kind = DomainErrorKindEnum.FORBIDDEN;
  readonly code = AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW;

  constructor() {
    super('Cadastro em análise.');
  }
}

describe('HttpExceptionFilter', () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'POST', url: '/v1/affiliate/auth/login' }),
    }),
  } as unknown as ArgumentsHost;

  let logError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // O 500 é logado com stack; aqui só interessa o corpo da resposta.
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logError.mockRestore();
  });

  const bodySentFor = (exception: unknown): Record<string, unknown> => {
    new HttpExceptionFilter().catch(exception, host);
    return json.mock.calls[0][0];
  };

  it('maps a not found domain error to 404', () => {
    const body = bodySentFor(new AffiliateNotFoundError());

    expect(status).toHaveBeenCalledWith(404);
    expect(body).toMatchObject({
      statusCode: 404,
      code: null,
      message: 'Afiliado não encontrado.',
    });
  });

  it('carries the error code the client needs to choose its message', () => {
    const body = bodySentFor(new RegistrationUnderReviewError());

    expect(status).toHaveBeenCalledWith(403);
    expect(body).toMatchObject({
      code: AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW,
      message: 'Cadastro em análise.',
    });
  });

  it('keeps the status of an http exception raised by the framework', () => {
    const body = bodySentFor(new BadRequestException('Campo obrigatório'));

    expect(status).toHaveBeenCalledWith(400);
    expect(body).toMatchObject({ statusCode: 400, message: 'Campo obrigatório' });
  });

  it('keeps the field messages of a validation error as a list', () => {
    const body = bodySentFor(
      new BadRequestException({
        statusCode: 400,
        message: ['Informe um e-mail válido.', 'Informe um CPF válido.'],
        error: 'Bad Request',
      }),
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(body.message).toEqual(['Informe um e-mail válido.', 'Informe um CPF válido.']);
  });

  it('reads the code out of an http exception payload', () => {
    const body = bodySentFor(
      new ForbiddenException({
        code: AuthErrorCodeEnum.ACCOUNT_INACTIVE,
        message: 'Conta inativa.',
      }),
    );

    expect(body).toMatchObject({ code: AuthErrorCodeEnum.ACCOUNT_INACTIVE });
  });

  it('answers 500 without leaking the message of an unexpected error', () => {
    const body = bodySentFor(new Error('column "foo" does not exist'));

    expect(status).toHaveBeenCalledWith(500);
    expect(body).toMatchObject({ statusCode: 500, message: 'Erro interno' });
  });
});

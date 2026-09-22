import { AuthErrorCodeEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { fieldForErrorCode } from './errors';

describe('fieldForErrorCode', () => {
  it.each([
    [RegistrationErrorCodeEnum.INVALID_CPF, 'cpf'],
    [RegistrationErrorCodeEnum.CPF_ALREADY_REGISTERED, 'cpf'],
    [RegistrationErrorCodeEnum.INVALID_RG, 'rg'],
    [RegistrationErrorCodeEnum.RG_ALREADY_REGISTERED, 'rg'],
    [RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED, 'email'],
    [RegistrationErrorCodeEnum.PIX_KEY_INVALID, 'pixKey'],
    [RegistrationErrorCodeEnum.PIX_KEY_MISMATCH, 'pixKey'],
    [RegistrationErrorCodeEnum.TERMS_NOT_ACCEPTED, 'termsAccepted'],
  ])('points %s at the %s field', (code, field) => {
    expect(fieldForErrorCode(code)).toBe(field);
  });

  it('has no field for a code from another domain', () => {
    expect(fieldForErrorCode(AuthErrorCodeEnum.INVALID_CREDENTIALS)).toBeNull();
  });

  it('has no field when the response carries no code', () => {
    expect(fieldForErrorCode(null)).toBeNull();
  });
});

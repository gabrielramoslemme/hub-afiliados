import { AuthErrorCodeEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { fieldForErrorCode } from './registration-errors';

describe('fieldForErrorCode', () => {
  it('points an invalid cpf at the cpf field', () => {
    expect(fieldForErrorCode(RegistrationErrorCodeEnum.INVALID_CPF)).toBe('cpf');
  });

  it('points a duplicated cpf at the cpf field', () => {
    expect(fieldForErrorCode(RegistrationErrorCodeEnum.CPF_ALREADY_REGISTERED)).toBe('cpf');
  });

  it('points a duplicated email at the email field', () => {
    expect(fieldForErrorCode(RegistrationErrorCodeEnum.EMAIL_ALREADY_REGISTERED)).toBe('email');
  });

  it('points an invalid pix key at the pix key field', () => {
    expect(fieldForErrorCode(RegistrationErrorCodeEnum.PIX_KEY_INVALID)).toBe('pixKey');
  });

  it('points a mismatched pix key at the pix key field', () => {
    expect(fieldForErrorCode(RegistrationErrorCodeEnum.PIX_KEY_MISMATCH)).toBe('pixKey');
  });

  it('has no field for a code from another domain', () => {
    expect(fieldForErrorCode(AuthErrorCodeEnum.INVALID_CREDENTIALS)).toBeNull();
  });

  it('has no field when the response carries no code', () => {
    expect(fieldForErrorCode(null)).toBeNull();
  });
});

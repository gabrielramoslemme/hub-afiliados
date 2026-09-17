import { AuthErrorCodeEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { signInMessageFor } from './errors';

const FROM_API = 'Mensagem da API.';

describe('signInMessageFor', () => {
  it.each([
    AuthErrorCodeEnum.INVALID_CREDENTIALS,
    AuthErrorCodeEnum.ACCOUNT_INACTIVE,
    AuthErrorCodeEnum.PASSWORD_NOT_SET,
    AuthErrorCodeEnum.INVALID_TOKEN,
  ])('explains %s in the words of the panel, not the api', (code) => {
    expect(signInMessageFor(code, FROM_API)).not.toBe(FROM_API);
  });

  it('falls back to the message the api sent for a code it does not know', () => {
    expect(signInMessageFor(RegistrationErrorCodeEnum.INVALID_CPF, FROM_API)).toBe(FROM_API);
  });

  it('falls back to the message the api sent when there is no code', () => {
    expect(signInMessageFor(null, FROM_API)).toBe(FROM_API);
  });
});

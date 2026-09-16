import { AuthErrorCodeEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { signInMessageFor } from './errors';

describe('signInMessageFor', () => {
  it('does not reveal which half of the credentials was wrong', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.INVALID_CREDENTIALS, 'qualquer coisa')).toBe(
      'E-mail ou senha inválidos.',
    );
  });

  it('explains an inactive account', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.ACCOUNT_INACTIVE, 'ignorada')).toBe(
      'Esta conta está inativa. Procure quem administra o painel.',
    );
  });

  it('explains an account whose password was never set', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.PASSWORD_NOT_SET, 'ignorada')).toBe(
      'Você ainda não criou uma senha. Use o link enviado por e-mail.',
    );
  });

  it('offers a way out when the recovery link no longer works', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.INVALID_TOKEN, 'ignorada')).toBe(
      'Este link não vale mais. Ele vale por 2 horas e só pode ser usado uma vez — peça um novo em "Esqueci minha senha".',
    );
  });

  it('falls back to the message the api sent for a code it does not know', () => {
    expect(signInMessageFor(RegistrationErrorCodeEnum.INVALID_CPF, 'Mensagem da API.')).toBe(
      'Mensagem da API.',
    );
  });

  it('falls back to the message the api sent when there is no code', () => {
    expect(signInMessageFor(null, 'Mensagem da API.')).toBe('Mensagem da API.');
  });
});

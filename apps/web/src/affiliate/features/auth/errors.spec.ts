import { AuthErrorCodeEnum, RegistrationErrorCodeEnum } from '@porto/contracts';
import { signInMessageFor } from './errors';

describe('signInMessageFor', () => {
  it('does not reveal which half of the credentials was wrong', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.INVALID_CREDENTIALS, 'qualquer coisa')).toBe(
      'E-mail ou senha inválidos.',
    );
  });

  it('explains a registration still under review', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.REGISTRATION_UNDER_REVIEW, 'ignorada')).toBe(
      'Seu cadastro ainda está em análise. Assim que houver decisão, você recebe um e-mail.',
    );
  });

  it('explains a rejected registration without repeating the reason on screen', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.REGISTRATION_REJECTED, 'ignorada')).toBe(
      'Seu cadastro não foi aprovado. O motivo foi enviado para o seu e-mail.',
    );
  });

  it('points to the email when the password was never created', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.PASSWORD_NOT_SET, 'ignorada')).toBe(
      'Você ainda não criou sua senha. Use o link que enviamos por e-mail.',
    );
  });

  it('explains an inactive account', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.ACCOUNT_INACTIVE, 'ignorada')).toBe(
      'Sua conta está inativa. Escreva para afiliados@portoservico.com.br.',
    );
  });

  /* Serve aos dois links, o da aprovação e o da recuperação, e a saída é a mesma para os dois. */
  it('offers a way out when a password link no longer works', () => {
    expect(signInMessageFor(AuthErrorCodeEnum.INVALID_TOKEN, 'ignorada')).toBe(
      'Este link não vale mais. Ele só pode ser usado uma vez, e expira — peça um novo em "Esqueci minha senha".',
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

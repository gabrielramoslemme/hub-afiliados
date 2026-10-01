import { passwordPolicyIssue, resetPasswordSchema } from '@porto/contracts';

/*
  A política mora em `@porto/contracts` e vale nas duas pontas: a tela recusa
  com a mensagem certa, e a API recusa o mesmo POST montado à mão. Os testes
  ficam aqui, como os dos outros schemas que a web consome.
*/
describe('password policy', () => {
  it('accepts a password that meets every rule', () => {
    expect(passwordPolicyIssue('SenhaNova!2026')).toBeNull();
  });

  it.each([
    ['shorter than twelve characters', 'Senha!2026', 'Use ao menos 12 caracteres.'],
    ['without an uppercase letter', 'senhanova!2026', 'Inclua uma letra maiúscula.'],
    ['without a lowercase letter', 'SENHANOVA!2026', 'Inclua uma letra minúscula.'],
    ['without a number', 'SenhaNova!Sem', 'Inclua um número.'],
    [
      'without a special character',
      'SenhaNova2026',
      'Inclua um caractere especial, como ! @ # ou $.',
    ],
  ])('refuses a password %s', (_rule, password, message) => {
    expect(passwordPolicyIssue(password)).toBe(message);
  });

  // O bcrypt lê 72 bytes, não 72 letras: com acento, cada letra pesa dois.
  it('counts the limit in bytes, the way bcrypt reads it', () => {
    const accented = `Ação!1${'é'.repeat(34)}`;

    expect(accented.length).toBeLessThan(72);
    expect(passwordPolicyIssue(accented)).toBe('Use no máximo 72 caracteres.');
  });

  it('accepts a letter with an accent as upper or lower case', () => {
    expect(passwordPolicyIssue('ÁrvoreÚmida!7')).toBeNull();
  });

  it('puts the first broken rule on the password field of the form', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc',
      password: 'curta',
      passwordConfirmation: 'curta',
    });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['password'], message: 'Use ao menos 12 caracteres.' }),
    ]);
  });
});

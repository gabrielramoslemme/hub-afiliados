import { changePixKeySchema, PixKeyTypeEnum } from '@porto/contracts';

/**
 * Mesma promessa do `registration-schema.spec.ts`: o formulário recusa antes de
 * enviar o que a API recusaria depois. A diferença é o CPF — a tela só conhece o
 * mascarado, então conferir que a chave é o CPF do cadastro fica com a API.
 */
const validInput = {
  pixKeyType: PixKeyTypeEnum.EMAIL,
  pixKey: 'marina@email.com',
  currentPassword: 'SenhaAtual!2026',
};

function parse(overrides: Partial<typeof validInput> = {}) {
  return changePixKeySchema.safeParse({ ...validInput, ...overrides });
}

function firstErrorOn(result: ReturnType<typeof parse>, path: string): string | undefined {
  if (result.success) return undefined;

  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('changePixKeySchema', () => {
  it('accepts a new email key confirmed by the password', () => {
    expect(parse().success).toBe(true);
  });

  it('asks for the current password', () => {
    expect(firstErrorOn(parse({ currentPassword: '' }), 'currentPassword')).toBe(
      'Informe sua senha atual.',
    );
  });

  it('asks for the key', () => {
    expect(firstErrorOn(parse({ pixKey: '  ' }), 'pixKey')).toBe('Informe a chave PIX.');
  });

  it('rejects an email key that is not an email', () => {
    expect(firstErrorOn(parse({ pixKey: 'marina' }), 'pixKey')).toBe(
      'Informe um e-mail válido como chave PIX.',
    );
  });

  it('rejects a phone key without area code', () => {
    expect(
      firstErrorOn(parse({ pixKeyType: PixKeyTypeEnum.PHONE, pixKey: '99999-9999' }), 'pixKey'),
    ).toBe('Informe um telefone válido como chave PIX.');
  });

  it('accepts a formatted phone key', () => {
    expect(parse({ pixKeyType: PixKeyTypeEnum.PHONE, pixKey: '(11) 99999-9999' }).success).toBe(
      true,
    );
  });

  it('rejects a cpf key with missing digits', () => {
    expect(
      firstErrorOn(parse({ pixKeyType: PixKeyTypeEnum.CPF, pixKey: '529.982.247' }), 'pixKey'),
    ).toBe('Informe um CPF válido como chave PIX.');
  });

  it('accepts a complete cpf key', () => {
    expect(parse({ pixKeyType: PixKeyTypeEnum.CPF, pixKey: '529.982.247-25' }).success).toBe(true);
  });
});

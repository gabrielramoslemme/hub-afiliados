import { createAffiliateSchema, PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';

/**
 * O DTO da API é a autoridade sobre o que entra. Este arquivo guarda a promessa
 * de que o formulário recusa antes de enviar o que a API recusaria depois —
 * divergência aqui vira ida e volta desnecessária na cara de quem se cadastra.
 */
const validInput = {
  fullName: 'Marina Ferraz',
  email: 'marina@email.com',
  cpf: '529.982.247-25',
  rg: '12.345.678-X',
  pixKeyType: PixKeyTypeEnum.EMAIL,
  pixKey: 'marina@email.com',
  socialNetwork: '' as SocialNetworkEnum | '',
  socialHandle: '',
};

function parse(overrides: Partial<typeof validInput> = {}) {
  return createAffiliateSchema.safeParse({ ...validInput, ...overrides });
}

function firstErrorOn(result: ReturnType<typeof parse>, path: string): string | undefined {
  if (result.success) return undefined;

  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('createAffiliateSchema', () => {
  it('accepts a complete registration', () => {
    expect(parse().success).toBe(true);
  });

  it('trims the full name', () => {
    const result = parse({ fullName: '  Marina Ferraz  ' });

    expect(result.success && result.data.fullName).toBe('Marina Ferraz');
  });

  it('trims and lowercases the email', () => {
    const result = parse({ email: '  Marina@Email.com ' });

    expect(result.success && result.data.email).toBe('marina@email.com');
  });

  it('rejects a name without a surname', () => {
    expect(firstErrorOn(parse({ fullName: 'Marina' }), 'fullName')).toBe(
      'Informe o nome e o sobrenome.',
    );
  });

  it('rejects a name longer than the column', () => {
    expect(parse({ fullName: `${'a'.repeat(260)} Ferraz` }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(firstErrorOn(parse({ email: 'marina@' }), 'email')).toBe('Informe um e-mail válido.');
  });

  it('accepts a cpf typed with punctuation', () => {
    expect(parse({ cpf: '529.982.247-25' }).success).toBe(true);
  });

  it('accepts a cpf typed with digits only', () => {
    expect(parse({ cpf: '52998224725' }).success).toBe(true);
  });

  it('rejects a cpf with fewer than eleven digits', () => {
    expect(firstErrorOn(parse({ cpf: '5299822472' }), 'cpf')).toBe('Informe um CPF válido.');
  });

  it('rejects an unknown pix key type', () => {
    const result = createAffiliateSchema.safeParse({ ...validInput, pixKeyType: 'BANK_SLIP' });

    expect(result.success).toBe(false);
  });

  it('rejects an empty pix key', () => {
    expect(firstErrorOn(parse({ pixKey: '   ' }), 'pixKey')).toBe('Informe a chave PIX.');
  });

  it('rejects a pix key of type email that is not an email', () => {
    expect(firstErrorOn(parse({ pixKey: 'marina' }), 'pixKey')).toBe(
      'Informe um e-mail válido como chave PIX.',
    );
  });

  it('rejects a pix key of type phone with fewer than ten digits', () => {
    const result = parse({ pixKeyType: PixKeyTypeEnum.PHONE, pixKey: '(11) 9999-999' });

    expect(firstErrorOn(result, 'pixKey')).toBe('Informe um telefone válido como chave PIX.');
  });

  it('accepts a pix key of type phone with eleven digits', () => {
    const result = parse({ pixKeyType: PixKeyTypeEnum.PHONE, pixKey: '(11) 99999-9999' });

    expect(result.success).toBe(true);
  });

  it('rejects a pix key of type cpf that differs from the informed cpf', () => {
    const result = parse({ pixKeyType: PixKeyTypeEnum.CPF, pixKey: '111.444.777-35' });

    expect(firstErrorOn(result, 'pixKey')).toBe(
      'A chave PIX do tipo CPF precisa ser igual ao CPF informado.',
    );
  });

  it('accepts a pix key of type cpf equal to the informed cpf, however it is punctuated', () => {
    const result = parse({ pixKeyType: PixKeyTypeEnum.CPF, pixKey: '52998224725' });

    expect(result.success).toBe(true);
  });

  it('accepts an rg typed with punctuation and stores it normalized', () => {
    const result = parse({ rg: '12.345.678-x' });

    expect(result.success && result.data.rg).toBe('12345678X');
  });

  it('rejects an empty rg', () => {
    expect(firstErrorOn(parse({ rg: '   ' }), 'rg')).toBe('Informe o RG.');
  });

  it('rejects an rg shorter than five characters', () => {
    expect(firstErrorOn(parse({ rg: '1234' }), 'rg')).toBe('Informe um RG válido.');
  });

  it('rejects an rg longer than twenty characters', () => {
    expect(firstErrorOn(parse({ rg: '1'.repeat(21) }), 'rg')).toBe('Informe um RG válido.');
  });

  it('rejects an rg with a symbol that is not punctuation', () => {
    expect(firstErrorOn(parse({ rg: '12345678/SP' }), 'rg')).toBe('Informe um RG válido.');
  });

  it('accepts a registration with neither social network nor handle', () => {
    expect(parse({ socialNetwork: '', socialHandle: '' }).success).toBe(true);
  });

  it('accepts a social network with its handle', () => {
    const result = parse({
      socialNetwork: SocialNetworkEnum.INSTAGRAM,
      socialHandle: 'marinaferraz',
    });

    expect(result.success).toBe(true);
  });

  it('strips the leading at from the handle', () => {
    const result = parse({
      socialNetwork: SocialNetworkEnum.TIKTOK,
      socialHandle: ' @marina.ferraz ',
    });

    expect(result.success && result.data.socialHandle).toBe('marina.ferraz');
  });

  it('rejects a social network without the handle', () => {
    const result = parse({ socialNetwork: SocialNetworkEnum.YOUTUBE, socialHandle: '  ' });

    expect(firstErrorOn(result, 'socialHandle')).toBe('Informe o @ da rede escolhida.');
  });

  it('rejects a handle without the social network', () => {
    const result = parse({ socialNetwork: '', socialHandle: '@marinaferraz' });

    expect(firstErrorOn(result, 'socialNetwork')).toBe('Escolha a rede social do @ informado.');
  });

  it('rejects a handle with a space', () => {
    const result = parse({
      socialNetwork: SocialNetworkEnum.FACEBOOK,
      socialHandle: 'marina ferraz',
    });

    expect(firstErrorOn(result, 'socialHandle')).toBe('Informe um @ válido, sem espaços.');
  });

  it('rejects a handle longer than thirty characters', () => {
    const result = parse({
      socialNetwork: SocialNetworkEnum.INSTAGRAM,
      socialHandle: 'a'.repeat(31),
    });

    expect(firstErrorOn(result, 'socialHandle')).toBe('O @ deve ter no máximo 30 caracteres.');
  });

  it('rejects an unknown social network', () => {
    const result = createAffiliateSchema.safeParse({ ...validInput, socialNetwork: 'ORKUT' });

    expect(result.success).toBe(false);
  });
});

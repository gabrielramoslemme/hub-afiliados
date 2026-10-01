import { Resend } from 'resend';
import { configServiceMock } from '@Testing/mocks/services/config-service.mock';
import { ResendProvider } from './resend.provider';

jest.mock('resend');

describe('ResendProvider', () => {
  const send = jest.fn();

  const input = {
    to: 'marina@example.com',
    toName: 'Marina Ferraz',
    subject: 'Cadastro aprovado — crie sua senha',
    html: '<p>Boas-vindas, Marina!</p>',
    text: 'Boas-vindas, Marina!',
  };

  function configWith(fromName: string, apiKey = 'test-key') {
    return configServiceMock({
      RESEND_API_KEY: apiKey,
      MAIL_FROM_EMAIL: 'nao-responda@afiliados.porto.example',
      MAIL_FROM_NAME: fromName,
    });
  }

  beforeEach(() => {
    send.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    jest.mocked(Resend).mockClear();
    jest.mocked(Resend).mockImplementation(() => ({ emails: { send } }) as unknown as Resend);
  });

  // Destinatário como endereço puro: a conta sem domínio verificado recusa `"Nome" <e-mail>`.
  it('sends the rendered content to the bare email of the recipient', async () => {
    await new ResendProvider(configWith('Hub de Afiliados')).send(input);

    expect(send).toHaveBeenCalledWith({
      from: '"Hub de Afiliados" <nao-responda@afiliados.porto.example>',
      to: 'marina@example.com',
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  });

  it('drops the quotes of a sender name that would break the header', async () => {
    await new ResendProvider(configWith('Hub "de" Afiliados')).send(input);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Hub de Afiliados" <nao-responda@afiliados.porto.example>',
      }),
    );
  });

  it('throws when the api answers with an error, since the sdk resolves either way', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid `to` field' },
    });

    await expect(new ResendProvider(configWith('Hub de Afiliados')).send(input)).rejects.toThrow(
      'Invalid `to` field',
    );
  });

  /*
    O SDK lança na construção quando não recebe chave. Em `test` não há chave, e a
    geração do OpenAPI da CI sobe o AppModule inteiro: um cliente criado na
    construção derrubaria a subida antes de qualquer e-mail.
  */
  it('creates the resend client only when the first email goes out', async () => {
    const provider = new ResendProvider(configWith('Hub de Afiliados'));

    expect(Resend).not.toHaveBeenCalled();

    await provider.send(input);
    await provider.send(input);

    expect(Resend).toHaveBeenCalledTimes(1);
    expect(Resend).toHaveBeenCalledWith('test-key');
  });

  /*
    A chave é opcional enquanto a conta do Resend não existe. Sem ela o SDK nem é
    criado: o envio falha com o motivo, e o MailService registra a falha.
  */
  it('fails without touching the sdk when there is no key', async () => {
    const provider = new ResendProvider(configWith('Hub de Afiliados', ''));

    await expect(provider.send(input)).rejects.toThrow('RESEND_API_KEY');
    expect(Resend).not.toHaveBeenCalled();
  });
});

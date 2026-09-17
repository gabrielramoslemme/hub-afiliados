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

  function configWith(fromName: string) {
    return configServiceMock({
      RESEND_API_KEY: 'test-key',
      MAIL_FROM_EMAIL: 'nao-responda@afiliados.porto.example',
      MAIL_FROM_NAME: fromName,
    });
  }

  beforeEach(() => {
    send.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null });
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
});

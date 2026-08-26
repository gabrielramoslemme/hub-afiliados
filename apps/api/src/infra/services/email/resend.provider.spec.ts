import { Resend } from 'resend';
import { EnvironmentVariableService } from '@Infra/config/environment-variable.service';
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

  function environmentWith(fromName: string): EnvironmentVariableService {
    return {
      resendApiKey: 'test-key',
      mailFromEmail: 'nao-responda@afiliados.porto.example',
      mailFromName: fromName,
    } as unknown as EnvironmentVariableService;
  }

  beforeEach(() => {
    send.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    jest.mocked(Resend).mockImplementation(() => ({ emails: { send } }) as unknown as Resend);
  });

  it('sends the rendered content to the recipient', async () => {
    await new ResendProvider(environmentWith('Hub de Afiliados')).send(input);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Hub de Afiliados" <nao-responda@afiliados.porto.example>',
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    );
  });

  it('addresses the recipient by the bare email, without the display name', async () => {
    await new ResendProvider(environmentWith('Hub de Afiliados')).send(input);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'marina@example.com' }));
  });

  it('drops the quotes of a sender name that would break the header', async () => {
    await new ResendProvider(environmentWith('Hub "de" Afiliados')).send(input);

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

    await expect(
      new ResendProvider(environmentWith('Hub de Afiliados')).send(input),
    ).rejects.toThrow('Invalid `to` field');
  });
});

import { Logger } from '@nestjs/common';
import { MailTemplateEnum } from '@porto/contracts';
import { MailService } from './mail.service';
import { MailProvider } from './mail-provider.interface';

describe('MailService', () => {
  const input = {
    template: MailTemplateEnum.REGISTRATION_APPROVED,
    to: 'marina@example.com',
    toName: 'Marina Ferraz',
    variables: { name: 'Marina', link: 'https://app.example/definir-senha?token=abc' },
  };

  it('delegates sending to the configured provider', async () => {
    const provider: MailProvider = { send: jest.fn().mockResolvedValue(undefined) };
    await new MailService(provider).send(input);
    expect(provider.send).toHaveBeenCalledWith(input);
  });

  it('does not propagate the error when the provider fails', async () => {
    const provider: MailProvider = {
      send: jest.fn().mockRejectedValue(new Error('MailerSend is down')),
    };
    const service = new MailService(provider);
    await expect(service.send(input)).resolves.toBeUndefined();
  });

  it('logs the error without exposing the recipient', async () => {
    const provider: MailProvider = { send: jest.fn().mockRejectedValue(new Error('boom')) };
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await new MailService(provider).send(input);

    const logged = spy.mock.calls[0]?.[0] as string;
    expect(logged).toContain(MailTemplateEnum.REGISTRATION_APPROVED);
    expect(logged).not.toContain('marina@example.com');
    spy.mockRestore();
  });
});

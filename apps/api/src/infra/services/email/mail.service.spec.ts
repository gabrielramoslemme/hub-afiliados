import { MailTemplateEnum } from '@porto/contracts';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailProvider } from './mail-provider.interface';

describe('MailService', () => {
  const input = {
    template: MailTemplateEnum.REGISTRATION_APPROVED,
    to: 'marina@example.com',
    toName: 'Marina Ferraz',
    variables: { name: 'Marina', link: 'https://app.example/definir-senha?token=abc' },
  };

  it('delega o envio ao provider configurado', async () => {
    const provider: MailProvider = { send: jest.fn().mockResolvedValue(undefined) };
    await new MailService(provider).send(input);
    expect(provider.send).toHaveBeenCalledWith(input);
  });

  it('não propaga erro quando o provider falha', async () => {
    const provider: MailProvider = { send: jest.fn().mockRejectedValue(new Error('MailerSend fora do ar')) };
    const service = new MailService(provider);
    await expect(service.send(input)).resolves.toBeUndefined();
  });

  it('registra o erro sem expor o destinatário', async () => {
    const provider: MailProvider = { send: jest.fn().mockRejectedValue(new Error('boom')) };
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await new MailService(provider).send(input);

    const logged = spy.mock.calls[0]?.[0] as string;
    expect(logged).toContain(MailTemplateEnum.REGISTRATION_APPROVED);
    expect(logged).not.toContain('marina@example.com');
    spy.mockRestore();
  });
});

import { Logger } from '@nestjs/common';
import { MailTemplateEnum } from '@porto/contracts';
import { MailService } from './mail.service';
import { MailProvider } from './mail-provider.interface';
import { MailRenderer, RenderedMail } from './mail-renderer.interface';

describe('MailService', () => {
  const input = {
    template: MailTemplateEnum.REGISTRATION_APPROVED,
    to: 'marina@example.com',
    toName: 'Marina Ferraz',
    variables: { name: 'Marina', link: 'https://app.example/definir-senha?token=abc' },
  };

  const rendered: RenderedMail = {
    subject: 'Cadastro aprovado — crie sua senha',
    html: '<p>Boas-vindas, Marina!</p>',
    text: 'Boas-vindas, Marina!',
  };

  function rendererReturning(value: RenderedMail): MailRenderer {
    return { render: jest.fn().mockResolvedValue(value) };
  }

  it('hands the rendered content and the recipient to the provider', async () => {
    const mailRenderer = rendererReturning(rendered);
    const mailProvider: MailProvider = { send: jest.fn().mockResolvedValue(undefined) };

    await new MailService(mailRenderer, mailProvider).send(input);

    expect(mailRenderer.render).toHaveBeenCalledWith(input);
    expect(mailProvider.send).toHaveBeenCalledWith({
      ...rendered,
      to: 'marina@example.com',
      toName: 'Marina Ferraz',
    });
  });

  it('does not propagate the error when the provider fails', async () => {
    const mailProvider: MailProvider = {
      send: jest.fn().mockRejectedValue(new Error('Resend is down')),
    };
    const service = new MailService(rendererReturning(rendered), mailProvider);

    await expect(service.send(input)).resolves.toBeUndefined();
  });

  it('does not reach the provider when rendering fails', async () => {
    const mailRenderer: MailRenderer = {
      render: jest.fn().mockRejectedValue(new Error('Variáveis ausentes')),
    };
    const mailProvider: MailProvider = { send: jest.fn() };

    await expect(new MailService(mailRenderer, mailProvider).send(input)).resolves.toBeUndefined();
    expect(mailProvider.send).not.toHaveBeenCalled();
  });

  it('logs the error without exposing the recipient', async () => {
    const mailProvider: MailProvider = { send: jest.fn().mockRejectedValue(new Error('boom')) };
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await new MailService(rendererReturning(rendered), mailProvider).send(input);

    const logged = spy.mock.calls[0]?.[0] as string;
    expect(logged).toContain(MailTemplateEnum.REGISTRATION_APPROVED);
    expect(logged).not.toContain('marina@example.com');
    spy.mockRestore();
  });
});

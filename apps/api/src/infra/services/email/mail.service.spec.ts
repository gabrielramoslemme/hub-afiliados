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

  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logError.mockRestore();
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

  // O fornecedor costuma citar o endereço na mensagem de erro, e ela chega ao log pelo stack.
  it('logs the failure without exposing the recipient', async () => {
    const mailProvider: MailProvider = {
      send: jest
        .fn()
        .mockRejectedValue(new Error('validation_error: cannot send to Marina@Example.com')),
    };

    await new MailService(rendererReturning(rendered), mailProvider).send(input);

    const logged = logError.mock.calls.flat().join('\n');
    expect(logged).toContain(MailTemplateEnum.REGISTRATION_APPROVED);
    expect(logged.toLowerCase()).not.toContain('marina@example.com');
  });
});

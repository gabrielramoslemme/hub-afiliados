import { MailTemplateEnum } from '@porto/contracts';
import { SendMailInput } from '@Domain/notifications/mailer';
import { RenderedMail } from './mail-renderer.interface';
import { ReactEmailRenderer } from './react-email.renderer';

describe('ReactEmailRenderer', () => {
  const renderer = new ReactEmailRenderer();
  const link = 'https://afiliados.porto.example/definir-senha?token=abc123';

  function inputFor(template: MailTemplateEnum, variables: Record<string, string>): SendMailInput {
    return { template, to: 'marina@example.com', toName: 'Marina Ferraz', variables };
  }

  it('renders the received registration email addressed to the affiliate', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.REGISTRATION_RECEIVED, { name: 'Marina' }),
    );

    expect(rendered.subject).toBe('Recebemos seu cadastro no Hub de Afiliados');
    expect(rendered.html).toContain('Marina');
    expect(rendered.text).toContain('Marina');
    expect(rendered.text).not.toContain('<');
  });

  describe('approval email', () => {
    let rendered: RenderedMail;

    beforeAll(async () => {
      rendered = await renderer.render(
        inputFor(MailTemplateEnum.REGISTRATION_APPROVED, {
          name: 'Marina',
          link,
          coupon: 'MARINA25',
          discountPercent: '10',
        }),
      );
    });

    it('carries the set-password link', () => {
      expect(rendered.subject).toBe('Cadastro aprovado — seu cupom já está valendo');
      expect(rendered.html).toContain(link);
      expect(rendered.text).toContain(link);
    });

    it('warns that the link expires', () => {
      expect(rendered.text).toContain('48 horas');
    });

    it('shows the issued coupon and its discount', () => {
      expect(rendered.html).toContain('MARINA25');
      expect(rendered.text).toContain('MARINA25');
      expect(rendered.text).toContain('10%');
    });
  });

  it('renders the rejection email with the reason given by the operator', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.REGISTRATION_REJECTED, {
        name: 'Marina',
        reason: 'CPF divergente do informado',
      }),
    );

    expect(rendered.subject).toBe('Sobre o seu cadastro no Hub de Afiliados');
    expect(rendered.html).toContain('CPF divergente do informado');
  });

  it('renders the password recovery email carrying the link', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.PASSWORD_RECOVERY, { name: 'Marina', link }),
    );

    expect(rendered.subject).toBe('Recuperação de senha');
    expect(rendered.html).toContain(link);
  });

  describe('pix key change warning', () => {
    let rendered: RenderedMail;

    beforeAll(async () => {
      rendered = await renderer.render(
        inputFor(MailTemplateEnum.PIX_KEY_CHANGED, {
          name: 'Marina',
          pixKeyType: 'PHONE',
          maskedPixKey: '(11) *****-8888',
        }),
      );
    });

    it('shows the new key masked', () => {
      expect(rendered.subject).toBe('Sua chave PIX foi alterada');
      expect(rendered.text).toContain('(11) *****-8888');
    });

    it('names the type of the new key in words', () => {
      expect(rendered.text).toContain('telefone');
      expect(rendered.text).not.toContain('PHONE');
    });

    it('tells how to react to a change nobody asked for', () => {
      expect(rendered.text).toContain('Se não foi você');
    });
  });

  it('escapes a reason that carries markup', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.REGISTRATION_REJECTED, {
        name: 'Marina',
        reason: '<script>alert(1)</script>',
      }),
    );

    expect(rendered.html).not.toContain('<script>');
  });

  it('fails naming the variable the template requires and did not get', async () => {
    await expect(
      renderer.render(inputFor(MailTemplateEnum.REGISTRATION_APPROVED, { name: 'Marina' })),
    ).rejects.toThrow('link');
  });
});

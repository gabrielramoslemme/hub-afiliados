import { MailTemplateEnum } from '@porto/contracts';
import { SendMailInput } from '@Domain/notifications/mailer';
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
  });

  const approved = { name: 'Marina', link, coupon: 'MARINA25', discountPercent: '10' };

  it('renders the approval email carrying the set-password link', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.REGISTRATION_APPROVED, approved),
    );

    expect(rendered.subject).toBe('Cadastro aprovado — seu cupom já está valendo');
    expect(rendered.html).toContain(link);
    expect(rendered.text).toContain(link);
  });

  it('warns in the approval email that the link expires', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.REGISTRATION_APPROVED, approved),
    );

    expect(rendered.text).toContain('48 horas');
  });

  it('shows the issued coupon in the approval email', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.REGISTRATION_APPROVED, approved),
    );

    expect(rendered.html).toContain('MARINA25');
    expect(rendered.text).toContain('MARINA25');
  });

  it('shows the discount of the issued coupon in the approval email', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.REGISTRATION_APPROVED, approved),
    );

    expect(rendered.text).toContain('10%');
  });

  it('refuses to render the approval email without the coupon', async () => {
    await expect(
      renderer.render(inputFor(MailTemplateEnum.REGISTRATION_APPROVED, { name: 'Marina', link })),
    ).rejects.toThrow('coupon');
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

  const pixKeyChanged = { name: 'Marina', pixKeyType: 'PHONE', maskedPixKey: '(11) *****-8888' };

  it('renders the pix key change warning with the new key masked', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.PIX_KEY_CHANGED, pixKeyChanged),
    );

    expect(rendered.subject).toBe('Sua chave PIX foi alterada');
    expect(rendered.text).toContain('(11) *****-8888');
  });

  it('names the type of the new pix key in words', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.PIX_KEY_CHANGED, pixKeyChanged),
    );

    expect(rendered.text).toContain('telefone');
    expect(rendered.text).not.toContain('PHONE');
  });

  it('tells how to react to a pix key change nobody asked for', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.PIX_KEY_CHANGED, pixKeyChanged),
    );

    expect(rendered.text).toContain('Se não foi você');
  });

  it('produces a plain text alternative free of markup', async () => {
    const rendered = await renderer.render(
      inputFor(MailTemplateEnum.REGISTRATION_RECEIVED, { name: 'Marina' }),
    );

    expect(rendered.text).not.toContain('<');
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

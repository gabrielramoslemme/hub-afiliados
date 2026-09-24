import { ReactElement } from 'react';
import { MailTemplateEnum, PixKeyTypeEnum } from '@porto/contracts';
import { EmailChanged } from './email-changed';
import { PasswordRecovery } from './password-recovery';
import { PixKeyChanged } from './pix-key-changed';
import { RegistrationApproved } from './registration-approved';
import { RegistrationReceived } from './registration-received';
import { RegistrationRejected } from './registration-rejected';

interface MailTemplateDefinition {
  subject: string;
  /**
   * `SendMailInput.variables` é um saco de strings, então o que cada template
   * exige não chega ao compilador: a lista é o que o renderer confere antes de
   * montar o elemento, para a falta virar erro nomeado e não um `undefined`
   * impresso no corpo do e-mail.
   */
  requiredVariables: readonly string[];
  build(variables: Record<string, string>): ReactElement;
}

export const MAIL_TEMPLATES: Record<MailTemplateEnum, MailTemplateDefinition> = {
  [MailTemplateEnum.REGISTRATION_RECEIVED]: {
    subject: 'Recebemos seu cadastro no Hub de Afiliados',
    requiredVariables: ['name'],
    build(variables) {
      return <RegistrationReceived name={variables.name} />;
    },
  },
  [MailTemplateEnum.REGISTRATION_APPROVED]: {
    subject: 'Cadastro aprovado — seu cupom já está valendo',
    requiredVariables: ['name', 'link', 'coupon', 'discountPercent'],
    build(variables) {
      return (
        <RegistrationApproved
          name={variables.name}
          link={variables.link}
          coupon={variables.coupon}
          discountPercent={variables.discountPercent}
        />
      );
    },
  },
  [MailTemplateEnum.REGISTRATION_REJECTED]: {
    subject: 'Sobre o seu cadastro no Hub de Afiliados',
    requiredVariables: ['name', 'reason'],
    build(variables) {
      return <RegistrationRejected name={variables.name} reason={variables.reason} />;
    },
  },
  [MailTemplateEnum.PASSWORD_RECOVERY]: {
    subject: 'Recuperação de senha',
    requiredVariables: ['name', 'link'],
    build(variables) {
      return <PasswordRecovery name={variables.name} link={variables.link} />;
    },
  },
  [MailTemplateEnum.PIX_KEY_CHANGED]: {
    subject: 'Sua chave PIX foi alterada',
    requiredVariables: ['name', 'pixKeyType', 'maskedPixKey'],
    build(variables) {
      return (
        <PixKeyChanged
          name={variables.name}
          // O `ChangePixKeyUseCase` é quem envia, e ele passa o valor do enum.
          pixKeyType={variables.pixKeyType as PixKeyTypeEnum}
          maskedPixKey={variables.maskedPixKey}
        />
      );
    },
  },
  [MailTemplateEnum.EMAIL_CHANGED]: {
    subject: 'O e-mail da sua conta foi alterado',
    requiredVariables: ['name', 'newEmail'],
    build(variables) {
      return <EmailChanged name={variables.name} newEmail={variables.newEmail} />;
    },
  },
};

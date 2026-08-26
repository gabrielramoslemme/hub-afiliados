import { ReactElement } from 'react';
import { MailTemplateEnum } from '@porto/contracts';
import { PasswordRecovery } from './password-recovery';
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
    subject: 'Cadastro aprovado — crie sua senha',
    requiredVariables: ['name', 'link'],
    build(variables) {
      return <RegistrationApproved name={variables.name} link={variables.link} />;
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
};

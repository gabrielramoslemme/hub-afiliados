import { MailTemplateEnum } from '@porto/contracts';

export const MAIL_TEMPLATE_ENV_KEY: Record<MailTemplateEnum, string> = {
  [MailTemplateEnum.REGISTRATION_RECEIVED]: 'MAILERSEND_TEMPLATE_REGISTRATION_RECEIVED',
  [MailTemplateEnum.REGISTRATION_APPROVED]: 'MAILERSEND_TEMPLATE_REGISTRATION_APPROVED',
  [MailTemplateEnum.REGISTRATION_REJECTED]: 'MAILERSEND_TEMPLATE_REGISTRATION_REJECTED',
  [MailTemplateEnum.PASSWORD_RECOVERY]: 'MAILERSEND_TEMPLATE_PASSWORD_RECOVERY',
};

export const MAIL_SUBJECT: Record<MailTemplateEnum, string> = {
  [MailTemplateEnum.REGISTRATION_RECEIVED]: 'Recebemos seu cadastro no Hub de Afiliados',
  [MailTemplateEnum.REGISTRATION_APPROVED]: 'Cadastro aprovado — crie sua senha',
  [MailTemplateEnum.REGISTRATION_REJECTED]: 'Sobre o seu cadastro no Hub de Afiliados',
  [MailTemplateEnum.PASSWORD_RECOVERY]: 'Recuperação de senha',
};

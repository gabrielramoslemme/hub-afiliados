import type { AffiliateMeResponse } from '@porto/contracts';
import {
  formatCpfDisplay,
  formatDate,
  formatPixKeyDisplay,
  formatSocialProfile,
  occupationName,
  pixKeyTypeName,
} from '@/shared/lib/format';

export type ProfileField =
  | 'name'
  | 'email'
  | 'cpf'
  | 'rg'
  | 'occupation'
  | 'pixKeyType'
  | 'pixKey'
  | 'social'
  | 'createdAt';

export interface ProfileRow {
  field: ProfileField;
  label: string;
  value: string;
  /** O valor inteiro, que só aparece quando a própria pessoa pede. */
  revealed?: string;
}

/**
 * Uma linha por campo do cadastro, na ordem do formulário. CPF, RG e chave PIX
 * abrem mascarados porque esta tela abre num balcão ou num ônibus, com alguém
 * ao lado; o valor inteiro fica a um clique de quem é o dono dele. O `@`, não:
 * ele é público por natureza, e mascará-lo esconderia o que a pessoa divulga.
 */
export function profileRows(account: AffiliateMeResponse): ProfileRow[] {
  return [
    { field: 'name', label: 'Nome completo', value: account.name },
    { field: 'email', label: 'E-mail', value: account.email },
    {
      field: 'cpf',
      label: 'CPF',
      value: account.maskedCpf,
      revealed: formatCpfDisplay(account.cpf),
    },
    { field: 'rg', label: 'RG', value: account.maskedRg, revealed: account.rg },
    { field: 'occupation', label: 'Ocupação', value: occupationName(account.occupation) },
    { field: 'pixKeyType', label: 'Tipo de chave PIX', value: pixKeyTypeName(account.pixKeyType) },
    {
      field: 'pixKey',
      label: 'Chave PIX',
      value: account.maskedPixKey,
      revealed: formatPixKeyDisplay(account.pixKeyType, account.pixKey),
    },
    // A rede é opcional no cadastro, mas a linha fica: sumir com ela faria a
    // pessoa achar que o perfil perdeu um dado que ela nunca informou.
    {
      field: 'social',
      label: 'Rede social',
      value: formatSocialProfile(account.socialNetwork, account.socialHandle) ?? 'Não informada',
    },
    { field: 'createdAt', label: 'No programa desde', value: formatDate(account.createdAt) },
  ];
}

import type {
  AffiliateDocumentsResponse,
  AffiliateMeResponse,
  PixKeyTypeEnum,
} from '@porto/contracts';
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

export type RevealableField = keyof AffiliateDocumentsResponse;

interface PlainRow {
  field: Exclude<ProfileField, RevealableField>;
  label: string;
  value: string;
  revealable?: never;
}

interface RevealableRow {
  field: RevealableField;
  label: string;
  /** A versão mascarada: o valor inteiro chega só quando a própria pessoa pede, com a senha. */
  value: string;
  revealable: true;
}

export type ProfileRow = PlainRow | RevealableRow;

/**
 * Uma linha por campo do cadastro, na ordem do formulário. CPF, RG e chave PIX
 * abrem mascarados porque esta tela abre num balcão ou num ônibus, com alguém
 * ao lado; o valor inteiro nem vem na leitura do perfil, e chega pela senha. O `@`, não:
 * ele é público por natureza, e mascará-lo esconderia o que a pessoa divulga.
 */
export function profileRows(account: AffiliateMeResponse): ProfileRow[] {
  return [
    { field: 'name', label: 'Nome completo', value: account.name },
    { field: 'email', label: 'E-mail', value: account.email },
    { field: 'cpf', label: 'CPF', value: account.maskedCpf, revealable: true },
    { field: 'rg', label: 'RG', value: account.maskedRg, revealable: true },
    { field: 'occupation', label: 'Ocupação', value: occupationName(account.occupation) },
    { field: 'pixKeyType', label: 'Tipo de chave PIX', value: pixKeyTypeName(account.pixKeyType) },
    { field: 'pixKey', label: 'Chave PIX', value: account.maskedPixKey, revealable: true },
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

/** Os documentos inteiros no mesmo formato em que a versão mascarada aparece. */
export function revealedDocuments(
  documents: AffiliateDocumentsResponse,
  pixKeyType: PixKeyTypeEnum,
): Record<RevealableField, string> {
  return {
    cpf: formatCpfDisplay(documents.cpf),
    rg: documents.rg,
    pixKey: formatPixKeyDisplay(pixKeyType, documents.pixKey),
  };
}

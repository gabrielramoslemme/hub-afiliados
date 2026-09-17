import { PixKeyTypeEnum } from '@porto/contracts';

const CPF_DIGITS = 11;
const PHONE_DIGITS = 11;
const RG_CHARS = 20;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Máscara progressiva: formata o que já foi digitado sem esperar o campo fechar.
 * Separador que aparece antes do dígito que o justifica trava o cursor no meio
 * da digitação — daí cada faixa só acrescentar o que já tem conteúdo.
 */
export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, CPF_DIGITS);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * O RG não tem formato nacional: cada estado emite o seu, o comprimento varia e
 * há UF que usa letra como dígito verificador. Por isso a máscara agrupa no
 * padrão mais comum — 2.3.3-1 — sem impor tamanho: documento mais longo mantém
 * o agrupamento e continua depois do hífen, em vez de perder a pontuação toda
 * quando o décimo caractere chega.
 *
 * Ela insere só `.` e `-`, que é exatamente o que a API tira ao normalizar, então
 * o que aparece no campo é o que vai ficar gravado.
 */
export function formatRg(value: string): string {
  const chars = value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, RG_CHARS);

  if (chars.length <= 2) return chars;
  if (chars.length <= 5) return `${chars.slice(0, 2)}.${chars.slice(2)}`;
  if (chars.length <= 8) return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5)}`;

  return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5, 8)}-${chars.slice(8)}`;
}

/** Fixo (10 dígitos) e celular (11) usam corte diferente antes do hífen. */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, PHONE_DIGITS);

  if (digits.length <= 2) return digits.length === 0 ? '' : `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * O arroba é moldura do campo e nenhuma rede aceita espaço no perfil: tirar os
 * dois enquanto se digita deixa no campo exatamente o que vai ser gravado.
 *
 * Ela para aí, pelo mesmo motivo da máscara de RG: engolir todo caractere que o
 * schema recusa faria `marina/ferraz` virar outro perfil no lugar de recusar o
 * que foi digitado.
 */
export function formatSocialHandle(value: string): string {
  return value.replace(/\s/g, '').replace(/^@+/, '');
}

const PIX_KEY_PLACEHOLDERS: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'voce@email.com',
  [PixKeyTypeEnum.PHONE]: '(11) 99999-9999',
  [PixKeyTypeEnum.CPF]: '000.000.000-00',
};

/** O exemplo do campo já no formato que a máscara do tipo produz. */
export function pixKeyPlaceholder(type: PixKeyTypeEnum): string {
  return PIX_KEY_PLACEHOLDERS[type];
}

/** E-mail não tem máscara: qualquer formatação atrapalharia quem digita. */
export function formatPixKey(type: PixKeyTypeEnum, value: string): string {
  if (type === PixKeyTypeEnum.CPF) return formatCpf(value);
  if (type === PixKeyTypeEnum.PHONE) return formatPhone(value);

  return value;
}

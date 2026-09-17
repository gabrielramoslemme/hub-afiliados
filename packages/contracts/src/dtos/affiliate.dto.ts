import { z } from 'zod';
import type { AffiliateStatusEnum, StatementEntryKindEnum } from '../enums';
import { PixKeyTypeEnum, SocialNetworkEnum } from '../enums';
import type { CouponSummary } from './coupon.dto';

/** Item da fila de aprovação. CPF já vem mascarado da API. */
export interface AffiliateListItem {
  publicId: string;
  name: string;
  email: string;
  maskedCpf: string;
  status: AffiliateStatusEnum;
  createdAt: string;
}

export interface AffiliateDetail extends AffiliateListItem {
  cpf: string;
  rg: string;
  socialNetwork: SocialNetworkEnum | null;
  socialHandle: string | null;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectionReason: string | null;
  /** Emitido na aprovação. Nulo em cadastro ainda não aprovado ou reprovado. */
  coupon: CouponSummary | null;
}

export interface AffiliateStatusHistoryItem {
  fromStatus: AffiliateStatusEnum | null;
  toStatus: AffiliateStatusEnum;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

/*
  O que a própria pessoa vê da sua conta. Diferente do `AffiliateDetail`, que é
  a visão da analista: aqui não há `approvedByName` nem `rejectionReason` de
  outra pessoa, e o CPF chega mascarado — o afiliado já sabe o dele, e um CPF
  completo numa tela aberta em público não serve a ninguém.
*/
export interface AffiliateMeResponse {
  publicId: string;
  name: string;
  email: string;
  maskedCpf: string;
  maskedRg: string;
  socialNetwork: SocialNetworkEnum | null;
  socialHandle: string | null;
  pixKeyType: PixKeyTypeEnum;
  maskedPixKey: string;
  status: AffiliateStatusEnum;
  /** Nulo enquanto a Porto não emitir o cupom do afiliado aprovado. */
  coupon: string | null;
  createdAt: string;
}

export interface AffiliateStatementEntry {
  id: string;
  kind: StatementEntryKindEnum;
  title: string;
  detail: string;
  /** Centavos, sempre positivo. O sinal quem dá é o `kind`. */
  cents: number;
  occurredAt: string;
}

export interface AffiliateWalletResponse {
  /** Centavos. Dinheiro em ponto flutuante acumula erro na soma. */
  balanceCents: number;
  /** Total já pago via PIX, em centavos. */
  paidCents: number;
  updatedAt: string;
  entries: AffiliateStatementEntry[];
}

export const rejectAffiliateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Descreva o motivo com ao menos 10 caracteres')
    .max(500, 'O motivo deve ter no máximo 500 caracteres'),
});

export type RejectAffiliateRequest = z.infer<typeof rejectAffiliateSchema>;

/*
  Aprovar é criar o cupom, registrado na Porto no mesmo passo, e por isso os
  dois campos são obrigatórios. Os limites são os que o INT-01 impõe ao
  percentual (maior que 0, até 25) e os que o produto impõe ao código — mais
  estreitos que os 200 caracteres que a Porto aceita, porque quem digita o
  cupom é um cliente final no checkout.
*/
const COUPON_CODE_PATTERN = /^[A-Z0-9]+$/;

export const approveAffiliateSchema = z.object({
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, 'O código deve ter ao menos 4 caracteres')
    .max(20, 'O código deve ter no máximo 20 caracteres')
    .regex(COUPON_CODE_PATTERN, 'Use apenas letras e números, sem espaço nem acento'),
  // `coerce` porque o `input[type=number]` entrega string, e o formulário é a
  // única origem deste schema no navegador.
  couponDiscountPercent: z.coerce
    .number({ message: 'Informe o percentual de desconto' })
    .int('O percentual deve ser um número inteiro')
    .min(1, 'O desconto começa em 1%')
    .max(25, 'O desconto vai até 25%'),
});

export type ApproveAffiliateRequest = z.infer<typeof approveAffiliateSchema>;

/**
 * O que o formulário guarda enquanto a analista preenche, que não é o que ele
 * envia: o `input[type=number]` entrega o percentual como string, e o `coerce`
 * do schema é quem o transforma em número. `ApproveAffiliateRequest` é o depois.
 */
export type ApproveAffiliateFormValues = z.input<typeof approveAffiliateSchema>;

/**
 * Cadastro público do afiliado, espelhando `CreateAffiliateRequestDto` da API.
 * O DTO de lá continua sendo a autoridade: este schema existe para o formulário
 * recusar antes de enviar o que a API recusaria depois.
 *
 * O que **não** entra aqui: dígito verificador do CPF, que a API valida com
 * `cpf-cnpj-validator`. Reimplementar o cálculo criaria uma segunda fonte da
 * mesma regra; o `INVALID_CPF` da resposta vira erro no campo do CPF.
 */
const FULL_NAME_PATTERN = /^\S+(\s+\S+)+$/;
const PIX_PHONE_PATTERN = /^\d{10,13}$/;
const CPF_LENGTH = 11;
/*
  O RG não tem formato nacional: cada estado emite o seu, o comprimento varia e
  há UF que usa letra como dígito verificador. A regra é de forma, e a limpeza
  tira só a pontuação de RG — engolir qualquer símbolo faria `12345678/SP` virar
  o RG `12345678SP`, mudando o documento em vez de recusar o que foi digitado.
*/
const RG_PATTERN = /^[A-Z0-9]{5,20}$/;
const SOCIAL_HANDLE_PATTERN = /^[A-Za-z0-9._-]+$/;
const SOCIAL_HANDLE_MAX = 30;

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

const pixKeyTypeField = z.enum(PixKeyTypeEnum, { message: 'Escolha o tipo da chave PIX.' });

const pixKeyField = z
  .string()
  .trim()
  .min(1, 'Informe a chave PIX.')
  .max(140, 'A chave PIX deve ter no máximo 140 caracteres.');

/**
 * A forma da chave de e-mail e de telefone, igual no cadastro e na troca pelo
 * perfil. A do tipo CPF fica com cada schema: no cadastro ela se compara ao CPF
 * digitado ao lado, e na troca a tela só conhece o CPF mascarado.
 */
function pixKeyFormatIssue(type: PixKeyTypeEnum, key: string): string | null {
  if (type === PixKeyTypeEnum.EMAIL && !z.email().safeParse(key.toLowerCase()).success) {
    return 'Informe um e-mail válido como chave PIX.';
  }

  if (type === PixKeyTypeEnum.PHONE && !PIX_PHONE_PATTERN.test(digitsOf(key))) {
    return 'Informe um telefone válido como chave PIX.';
  }

  return null;
}

function normalizeRg(value: string): string {
  return value.replace(/[.\-\s]/g, '').toUpperCase();
}

/** O `@` é guardado sem o arroba: com ou sem, tem que virar o mesmo registro. */
function normalizeSocialHandle(value: string): string {
  return value.trim().replace(/^@+/, '');
}

export const createAffiliateSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Informe o nome completo.')
      .max(255, 'O nome deve ter no máximo 255 caracteres.')
      .regex(FULL_NAME_PATTERN, 'Informe o nome e o sobrenome.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Informe um e-mail válido.')
      .max(255, 'O e-mail deve ter no máximo 255 caracteres.')
      .refine((value) => z.email().safeParse(value).success, 'Informe um e-mail válido.'),
    cpf: z
      .string()
      .trim()
      .refine((value) => digitsOf(value).length === CPF_LENGTH, 'Informe um CPF válido.'),
    rg: z
      .string()
      .trim()
      .min(1, 'Informe o RG.')
      .transform(normalizeRg)
      .refine((value) => RG_PATTERN.test(value), 'Informe um RG válido.'),
    pixKeyType: pixKeyTypeField,
    pixKey: pixKeyField,
    // Vazio é a ausência da rede, não um valor: o `select` do formulário começa
    // sem escolha, e ele é quem manda o `''`.
    socialNetwork: z
      .union([z.enum(SocialNetworkEnum), z.literal('')], {
        message: 'Escolha uma rede social da lista.',
      })
      .default(''),
    socialHandle: z.string().transform(normalizeSocialHandle).default(''),
    /*
      Aceite do Regulamento. `boolean` e não `literal(true)`: a caixa nasce
      desmarcada, e um tipo de entrada que só admite `true` não descreveria o
      estado em que o formulário abre.
    */
    termsAccepted: z
      .boolean()
      .refine((value) => value, 'É preciso aceitar o Regulamento do programa.'),
  })
  .superRefine((input, ctx) => {
    const reject = (field: 'pixKey' | 'socialNetwork' | 'socialHandle', message: string) =>
      ctx.addIssue({ code: 'custom', path: [field], message });

    const pixKeyIssue = pixKeyFormatIssue(input.pixKeyType, input.pixKey);
    if (pixKeyIssue) reject('pixKey', pixKeyIssue);

    // A chave do tipo CPF é a única verificação de titularidade possível sem
    // consultar terceiros: ela tem que ser o CPF de quem está se cadastrando.
    if (input.pixKeyType === PixKeyTypeEnum.CPF && digitsOf(input.pixKey) !== digitsOf(input.cpf)) {
      reject('pixKey', 'A chave PIX do tipo CPF precisa ser igual ao CPF informado.');
    }

    // Rede e `@` são opcionais, mas indivisíveis: `@` sem rede não abre perfil
    // nenhum, e rede sem `@` não diz onde procurar.
    if (input.socialNetwork && !input.socialHandle) {
      reject('socialHandle', 'Informe o @ da rede escolhida.');
    }

    if (!input.socialNetwork && input.socialHandle) {
      reject('socialNetwork', 'Escolha a rede social do @ informado.');
    }

    if (input.socialHandle && !SOCIAL_HANDLE_PATTERN.test(input.socialHandle)) {
      reject('socialHandle', 'Informe um @ válido, sem espaços.');
    }

    if (input.socialHandle.length > SOCIAL_HANDLE_MAX) {
      reject('socialHandle', 'O @ deve ter no máximo 30 caracteres.');
    }
  });

export type CreateAffiliateRequest = z.infer<typeof createAffiliateSchema>;

/**
 * O que o formulário guarda enquanto a pessoa preenche, que não é o mesmo que
 * ele envia: rede e `@` nascem vazios e o RG sai daqui como foi digitado. O
 * schema é quem normaliza — `CreateAffiliateRequest` é o depois.
 */
export type CreateAffiliateFormValues = z.input<typeof createAffiliateSchema>;

export interface CreateAffiliateResponse {
  publicId: string;
  status: AffiliateStatusEnum;
}

/**
 * A troca da chave PIX pelo perfil, espelhando `ChangePixKeyRequestDto` da API.
 * A senha atual vai junto porque a chave é o destino do pagamento: uma sessão
 * esquecida aberta não pode bastar para desviá-lo.
 *
 * Na chave do tipo CPF o schema cobra só os 11 dígitos. Ser o CPF do cadastro é
 * conferido pela API — a tela recebe o CPF mascarado e não tem com o que comparar.
 */
export const changePixKeySchema = z
  .object({
    pixKeyType: pixKeyTypeField,
    pixKey: pixKeyField,
    // Sem `trim`: espaço é caractere válido de senha, e aparar mudaria o que a
    // pessoa digitou antes de o bcrypt comparar.
    currentPassword: z.string().min(1, 'Informe sua senha atual.'),
  })
  .superRefine((input, ctx) => {
    const cpfKeyIssue =
      digitsOf(input.pixKey).length === CPF_LENGTH ? null : 'Informe um CPF válido como chave PIX.';
    const issue =
      input.pixKeyType === PixKeyTypeEnum.CPF
        ? cpfKeyIssue
        : pixKeyFormatIssue(input.pixKeyType, input.pixKey);

    if (issue) ctx.addIssue({ code: 'custom', path: ['pixKey'], message: issue });
  });

export type ChangePixKeyRequest = z.infer<typeof changePixKeySchema>;

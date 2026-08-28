import {
  type AffiliateDetail,
  type AffiliateMeResponse,
  type AffiliateStatementEntry,
  AffiliateStatusEnum,
  type AffiliateWalletResponse,
  PixKeyTypeEnum,
  SocialNetworkEnum,
  StatementEntryKindEnum,
} from '@porto/contracts';

/**
 * Fixtures determinísticas: nada de `Math.random` nem de `new Date()`. Duas
 * execuções precisam devolver a mesma fila, senão a tela muda entre um reload e
 * outro e ninguém confia no que está vendo.
 */
const SEED = [
  ['Marina Ferraz', 'marina.ferraz@email.com', '52998224725', AffiliateStatusEnum.PENDING_APPROVAL],
  [
    'Rogério Bastos',
    'rogerio.bastos@email.com',
    '11144477735',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
  ['Cleide Nakamura', 'cleide.nakamura@email.com', '39053344705', AffiliateStatusEnum.APPROVED],
  [
    'Alexandre Pimentel',
    'alexandre.pimentel@email.com',
    '12345678909',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
  ['Juliana Sarmento', 'juliana.sarmento@email.com', '98765432100', AffiliateStatusEnum.REJECTED],
  ['Wesley Andrade', 'wesley.andrade@email.com', '45678912377', AffiliateStatusEnum.APPROVED],
  ['Tatiane Lopes', 'tatiane.lopes@email.com', '32165498701', AffiliateStatusEnum.PENDING_APPROVAL],
  ['Ibrahim Nasser', 'ibrahim.nasser@email.com', '65498732103', AffiliateStatusEnum.SUSPENDED],
  [
    'Denise Vasconcelos',
    'denise.vasconcelos@email.com',
    '78945612304',
    AffiliateStatusEnum.APPROVED,
  ],
  [
    'Otávio Belchior',
    'otavio.belchior@email.com',
    '15975348609',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
  ['Simone Rebouças', 'simone.reboucas@email.com', '35715948602', AffiliateStatusEnum.REJECTED],
  ['Fábio Quintanilha', 'fabio.quintanilha@email.com', '75315948605', AffiliateStatusEnum.APPROVED],
  ['Neuza Caetano', 'neuza.caetano@email.com', '95175348601', AffiliateStatusEnum.PENDING_APPROVAL],
  [
    'Hélio Marcondes',
    'helio.marcondes@email.com',
    '85296374107',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
  ['Priscila D’Ávila', 'priscila.davila@email.com', '74185296308', AffiliateStatusEnum.APPROVED],
  [
    'Gustavo Iwasaki',
    'gustavo.iwasaki@email.com',
    '96385274104',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
  [
    'Rosângela Tavares',
    'rosangela.tavares@email.com',
    '25836914706',
    AffiliateStatusEnum.SUSPENDED,
  ],
  [
    'Bruno Sacramento',
    'bruno.sacramento@email.com',
    '36925814709',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
  ['Larissa Pontes', 'larissa.pontes@email.com', '14725836902', AffiliateStatusEnum.APPROVED],
  ['Edmilson Braga', 'edmilson.braga@email.com', '25814736903', AffiliateStatusEnum.REJECTED],
  [
    'Vanderleia Cruz',
    'vanderleia.cruz@email.com',
    '36914725805',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
  [
    'Kelly Fontenele',
    'kelly.fontenele@email.com',
    '45896312708',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
  ['Norberto Aguiar', 'norberto.aguiar@email.com', '78912345606', AffiliateStatusEnum.APPROVED],
  [
    'Sílvia Aparecida Rocha',
    'silvia.rocha@email.com',
    '32178965401',
    AffiliateStatusEnum.PENDING_APPROVAL,
  ],
] as const;

const PIX_TYPES = [PixKeyTypeEnum.EMAIL, PixKeyTypeEnum.PHONE, PixKeyTypeEnum.CPF];

const REJECTION_REASONS = [
  'Perfil fora do público-alvo do programa nesta etapa. O canal de divulgação informado não tem relação com serviços residenciais.',
  'Divergência entre o nome informado e a titularidade da chave PIX declarada.',
  'Cadastro duplicado: já existe um afiliado ativo com o mesmo canal de divulgação.',
];

const ANALYSTS = ['Camila Prestes', 'Rodrigo Salles', 'Tereza Bonfim'];

function maskCpf(cpf: string): string {
  return `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function pixKeyFor(index: number, cpf: string, email: string): string {
  const type = PIX_TYPES[index % PIX_TYPES.length];

  if (type === PixKeyTypeEnum.CPF) return cpf;
  if (type === PixKeyTypeEnum.PHONE) return `1198${String(1000000 + index * 4321).slice(0, 7)}`;

  return email;
}

/** Datas fixas, decrescentes a partir de 2026-08-19. */
function createdAtFor(index: number): string {
  const day = 19 - Math.floor(index / 3);
  const hour = 9 + (index % 8);

  return `2026-08-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:24:00.000Z`;
}

const SOCIAL_NETWORKS = Object.values(SocialNetworkEnum);

/** Um em cada três cadastros não informou rede — o par é opcional de verdade. */
function socialProfileFor(
  index: number,
  email: string,
): Pick<AffiliateDetail, 'socialNetwork' | 'socialHandle'> {
  if (index % 3 === 2) return { socialNetwork: null, socialHandle: null };

  return {
    socialNetwork: SOCIAL_NETWORKS[index % SOCIAL_NETWORKS.length],
    socialHandle: email.split('@')[0],
  };
}

export type MockAffiliate = AffiliateDetail;

function build(index: number): MockAffiliate {
  const [name, email, cpf, status] = SEED[index];
  const publicId = `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
  const createdAt = createdAtFor(index);
  const decidedAt = `2026-08-20T14:${String(10 + index).padStart(2, '0')}:00.000Z`;
  const actorName = ANALYSTS[index % ANALYSTS.length];

  return {
    publicId,
    name,
    email,
    maskedCpf: maskCpf(cpf),
    cpf,
    rg: `${cpf.slice(0, 8)}X`,
    ...socialProfileFor(index, email),
    status,
    createdAt,
    pixKeyType: PIX_TYPES[index % PIX_TYPES.length],
    pixKey: pixKeyFor(index, cpf, email),
    approvedAt: status === AffiliateStatusEnum.PENDING_APPROVAL ? null : decidedAt,
    approvedByName: status === AffiliateStatusEnum.PENDING_APPROVAL ? null : actorName,
    rejectionReason: status === AffiliateStatusEnum.REJECTED ? REJECTION_REASONS[index % 3] : null,
  };
}

export const mockAffiliates: MockAffiliate[] = SEED.map((_, index) => build(index));

/*
  A conta que o dublê autentica na área do afiliado. Sai de `mockAffiliates`,
  e não de um objeto solto, para não existirem duas verdades sobre a mesma
  pessoa: o índice 2 é o primeiro cadastro aprovado da lista.
*/
const account = mockAffiliates[2];

/** Mascara o RG como a API mascara: só os quatro últimos caracteres sobrevivem. */
function maskRg(rg: string): string {
  return `${'*'.repeat(rg.length - 4)}${rg.slice(-4)}`;
}

/** Mascara a chave do jeito que a API mascara: o suficiente para reconhecer. */
function maskPixKey(type: PixKeyTypeEnum, key: string): string {
  if (type === PixKeyTypeEnum.EMAIL) {
    const [user, domain] = key.split('@');
    return `${user.slice(0, 2)}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`;
  }

  const digits = key.replace(/\D/g, '');

  return type === PixKeyTypeEnum.CPF
    ? `***.***.${digits.slice(6, 9)}-**`
    : `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
}

export const mockAffiliateAccount: AffiliateMeResponse = {
  publicId: account.publicId,
  name: account.name,
  email: account.email,
  maskedCpf: account.maskedCpf,
  maskedRg: maskRg(account.rg),
  socialNetwork: account.socialNetwork,
  socialHandle: account.socialHandle,
  pixKeyType: account.pixKeyType,
  maskedPixKey: maskPixKey(account.pixKeyType, account.pixKey),
  status: account.status,
  coupon: 'CLEIDE25',
  createdAt: account.createdAt,
};

/*
  Extrato de exemplo. As datas são fixas, como o resto do arquivo: `new Date()`
  aqui faria a mesma tela mudar entre dois reloads.
*/
const ENTRIES: AffiliateStatementEntry[] = [
  {
    id: 'e1',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Serviços Automotivos',
    detail: 'Guincho 24h',
    cents: 32000,
    occurredAt: '2026-08-18T14:12:00.000Z',
  },
  {
    id: 'e2',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Serviços Residenciais',
    detail: 'Encanador',
    cents: 16000,
    occurredAt: '2026-08-15T09:40:00.000Z',
  },
  {
    id: 'e3',
    kind: StatementEntryKindEnum.PAYOUT,
    title: 'Pagamento via PIX',
    detail: 'Enviado para a sua chave',
    cents: 20000,
    occurredAt: '2026-08-14T11:05:00.000Z',
  },
  {
    id: 'e4',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Vidros Automotivos',
    detail: 'Para-brisa',
    cents: 8000,
    occurredAt: '2026-08-12T16:28:00.000Z',
  },
  {
    id: 'e5',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Funilaria e Pintura',
    detail: 'Reparo de lataria',
    cents: 10000,
    occurredAt: '2026-08-09T10:03:00.000Z',
  },
  {
    id: 'e6',
    kind: StatementEntryKindEnum.INCENTIVE,
    title: 'Seguro Residencial',
    detail: 'Apólice anual',
    cents: 6000,
    occurredAt: '2026-08-05T18:47:00.000Z',
  },
];

function totalOf(kind: StatementEntryKindEnum): number {
  return ENTRIES.filter((entry) => entry.kind === kind).reduce(
    (total, entry) => total + entry.cents,
    0,
  );
}

/*
  Saldo e pago saem da soma das linhas, nunca de um número escrito à mão. É o
  erro da referência que serviu de base: lá o saldo do topo não fecha com o
  extrato de baixo, e um extrato que não fecha ensina a não conferir extrato.
*/
export const mockWallet: AffiliateWalletResponse = {
  balanceCents: totalOf(StatementEntryKindEnum.INCENTIVE) - totalOf(StatementEntryKindEnum.PAYOUT),
  paidCents: totalOf(StatementEntryKindEnum.PAYOUT),
  updatedAt: '2026-08-21T12:00:00.000Z',
  entries: ENTRIES,
};

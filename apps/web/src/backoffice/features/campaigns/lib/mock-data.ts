/**
 * As campanhas de exemplo do painel. A Onda 1 vai do cadastro do afiliado até a
 * decisão da Porto — campanha não tem tabela, rota nem contrato ainda, então a
 * tela é montada aqui até existir uma leitura de verdade em `data.ts`. Quando
 * ela nascer, o que muda é a origem do dado: a montagem continua igual.
 *
 * O dado é ilustrativo e mesmo assim fecha a conta — período que termina depois
 * de começar, uma só campanha rodando por vez, pendente que nunca passa do
 * gerado. `mock-data.spec.ts` trava cada uma dessas coerências.
 */

/**
 * A linha de serviço que a campanha promove. É o vocabulário da Porto Serviços,
 * e não a categoria de prestador do dashboard: uma campanha fala de um serviço
 * vendido, não de quem atende o chamado.
 */
export const CAMPAIGN_CATEGORIES = [
  'Serviços Residenciais',
  'Serviços Automotivos',
  'Chaveiro',
  'Reparos e Reformas',
] as const;

export type CampaignCategory = (typeof CAMPAIGN_CATEGORIES)[number];

export type CampaignStatus = 'active' | 'scheduled' | 'ended' | 'canceled';

export interface Campaign {
  /** O identificador exposto é o `public_id`; o serial nunca sai da API. */
  publicId: string;
  name: string;
  description: string;
  category: CampaignCategory;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  /** O que o afiliado ganha a mais por participar, em pontos percentuais. */
  bonusPercent: number;
  participants: number;
  generatedCents: number;
  pendingCents: number;
}

/**
 * O "hoje" do exemplo. Sem ele, "agendada" e "encerrada" seriam rótulos soltos
 * que o relógio da máquina desmente — aqui as três situações são conferidas
 * contra a mesma data.
 */
export const REFERENCE_DATE = '2026-09-01T12:00:00.000Z';

/**
 * A campanha que está no ar. Fica em `const` própria porque o destaque do topo e
 * uma linha da tabela mostram o mesmo registro — duas cópias divergiriam no
 * primeiro ajuste de número.
 */
const upholstery: Campaign = {
  publicId: '20000000-0000-4000-8000-000000000001',
  name: 'Campanha dos Estofados',
  description:
    'Realize 3 ou mais serviços de estofados e ganhe 5% a mais de bônus sobre cada contratação.',
  category: 'Serviços Residenciais',
  status: 'active',
  startsAt: '2026-08-01T12:00:00.000Z',
  endsAt: '2026-10-31T12:00:00.000Z',
  bonusPercent: 5,
  participants: 3_000,
  generatedCents: 19_000_000,
  pendingCents: 1_000_000,
};

export const currentCampaign = upholstery;

/** Quantos afiliados entraram na campanha atual nos últimos sete dias. */
export const newParticipantsThisWeek = 200;

export const campaigns: Campaign[] = [
  {
    publicId: '20000000-0000-4000-8000-000000000002',
    name: 'Casa Conectada',
    description:
      'Campanha destinada ao incentivo de contratações de instalação e configuração de casa inteligente.',
    category: 'Serviços Residenciais',
    status: 'scheduled',
    startsAt: '2026-11-01T12:00:00.000Z',
    endsAt: '2027-01-31T12:00:00.000Z',
    bonusPercent: 6,
    participants: 0,
    generatedCents: 0,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000003',
    name: 'Chaveiro Sem Espera',
    description:
      'Indique acionamentos de chaveiro 24h e receba 4% de bônus sobre cada atendimento.',
    category: 'Chaveiro',
    status: 'scheduled',
    startsAt: '2026-10-01T12:00:00.000Z',
    endsAt: '2026-12-20T12:00:00.000Z',
    bonusPercent: 4,
    participants: 0,
    generatedCents: 0,
    pendingCents: 0,
  },
  upholstery,
  {
    publicId: '20000000-0000-4000-8000-000000000004',
    name: 'Marcenaria Sob Medida',
    description:
      'Campanha destinada ao incentivo de contratações de marcenaria planejada, encerrada antes do prazo.',
    category: 'Reparos e Reformas',
    status: 'canceled',
    startsAt: '2026-06-01T12:00:00.000Z',
    endsAt: '2026-08-31T12:00:00.000Z',
    bonusPercent: 5,
    participants: 220,
    generatedCents: 1_100_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000005',
    name: 'Inverno Sem Vazamento',
    description: 'Contratações de reparo hidráulico no período de chuva pagam 8% de bônus.',
    category: 'Reparos e Reformas',
    status: 'ended',
    startsAt: '2026-05-01T12:00:00.000Z',
    endsAt: '2026-07-31T12:00:00.000Z',
    bonusPercent: 8,
    participants: 1_840,
    generatedCents: 11_200_000,
    pendingCents: 250_000,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000006',
    name: 'Revisão de Meio de Ano',
    description:
      'Campanha destinada ao incentivo de contratações de revisão automotiva preventiva.',
    category: 'Serviços Automotivos',
    status: 'ended',
    startsAt: '2026-04-01T12:00:00.000Z',
    endsAt: '2026-06-30T12:00:00.000Z',
    bonusPercent: 6,
    participants: 1_220,
    generatedCents: 8_600_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000007',
    name: 'Volta às Aulas Residencial',
    description:
      'Pacote de pequenos reparos para o retorno às aulas, cancelado por revisão de meta.',
    category: 'Serviços Residenciais',
    status: 'canceled',
    startsAt: '2026-02-01T12:00:00.000Z',
    endsAt: '2026-03-31T12:00:00.000Z',
    bonusPercent: 5,
    participants: 640,
    generatedCents: 3_100_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000008',
    name: 'Chaveiro de Verão',
    description: 'Acionamentos de chaveiro na temporada de férias com 4% de bônus por contratação.',
    category: 'Chaveiro',
    status: 'ended',
    startsAt: '2026-01-05T12:00:00.000Z',
    endsAt: '2026-03-15T12:00:00.000Z',
    bonusPercent: 4,
    participants: 980,
    generatedCents: 5_400_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000009',
    name: 'Assistência 24h Automotiva',
    description:
      'Campanha destinada ao incentivo de contratações de assistência automotiva 24 horas.',
    category: 'Serviços Automotivos',
    status: 'ended',
    startsAt: '2025-11-01T12:00:00.000Z',
    endsAt: '2026-01-31T12:00:00.000Z',
    bonusPercent: 7,
    participants: 2_100,
    generatedCents: 14_300_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000010',
    name: 'Pintura de Fim de Ano',
    description: 'Pintura residencial para as festas, cancelada por falta de rede de prestadores.',
    category: 'Reparos e Reformas',
    status: 'canceled',
    startsAt: '2025-10-01T12:00:00.000Z',
    endsAt: '2025-12-20T12:00:00.000Z',
    bonusPercent: 6,
    participants: 410,
    generatedCents: 1_900_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000011',
    name: 'Elétrica Segura',
    description: 'Contratações de revisão elétrica residencial com 5% de bônus por indicação.',
    category: 'Serviços Residenciais',
    status: 'ended',
    startsAt: '2025-09-01T12:00:00.000Z',
    endsAt: '2025-11-30T12:00:00.000Z',
    bonusPercent: 5,
    participants: 1_560,
    generatedCents: 9_700_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000012',
    name: 'Ar-Condicionado Limpo',
    description: 'Campanha destinada ao incentivo de contratações de limpeza e higienização de ar.',
    category: 'Serviços Residenciais',
    status: 'ended',
    startsAt: '2025-06-01T12:00:00.000Z',
    endsAt: '2025-08-31T12:00:00.000Z',
    bonusPercent: 6,
    participants: 1_340,
    generatedCents: 8_100_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000013',
    name: 'Freios em Dia',
    description: 'Troca e revisão de freios com 5% de bônus sobre cada contratação fechada.',
    category: 'Serviços Automotivos',
    status: 'ended',
    startsAt: '2025-04-01T12:00:00.000Z',
    endsAt: '2025-06-30T12:00:00.000Z',
    bonusPercent: 5,
    participants: 1_120,
    generatedCents: 7_400_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000014',
    name: 'Chave Reserva',
    description: 'Cópia e codificação de chave automotiva com 4% de bônus por atendimento.',
    category: 'Chaveiro',
    status: 'ended',
    startsAt: '2025-02-01T12:00:00.000Z',
    endsAt: '2025-04-30T12:00:00.000Z',
    bonusPercent: 4,
    participants: 860,
    generatedCents: 4_600_000,
    pendingCents: 0,
  },
  {
    publicId: '20000000-0000-4000-8000-000000000015',
    name: 'Reforma Expressa',
    description: 'Campanha destinada ao incentivo de contratações de reforma rápida de ambientes.',
    category: 'Reparos e Reformas',
    status: 'ended',
    startsAt: '2024-11-01T12:00:00.000Z',
    endsAt: '2025-01-31T12:00:00.000Z',
    bonusPercent: 7,
    participants: 1_490,
    generatedCents: 10_200_000,
    pendingCents: 0,
  },
];

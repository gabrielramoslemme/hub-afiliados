import { type AffiliateReportRow, CouponStatusEnum } from '@porto/contracts';
import { statusLabel } from '@/shared/lib/affiliate-status';
import {
  formatCpfDisplay,
  formatDateTime,
  formatPixKeyDisplay,
  formatSocialProfile,
  occupationName,
  pixKeyTypeName,
  TIME_ZONE,
} from '@/shared/lib/format';

type CellValue = string | number | null;

export interface SheetColumn {
  header: string;
  key: string;
  width: number;
  /** Formato de número do Excel, só nas colunas de dinheiro e percentual. */
  numFmt?: string;
}

export interface AffiliatesSheet {
  columns: SheetColumn[];
  rows: Record<string, CellValue>[];
}

const BRL = '"R$" #,##0.00';

const COLUMNS: SheetColumn[] = [
  { header: 'Nome', key: 'name', width: 32 },
  { header: 'E-mail', key: 'email', width: 32 },
  { header: 'CPF', key: 'cpf', width: 16 },
  { header: 'RG', key: 'rg', width: 14 },
  { header: 'Ocupação', key: 'occupation', width: 28 },
  { header: 'Rede social', key: 'socialProfile', width: 30 },
  { header: 'Tipo de chave PIX', key: 'pixKeyType', width: 16 },
  { header: 'Chave PIX', key: 'pixKey', width: 32 },
  { header: 'Situação', key: 'status', width: 14 },
  { header: 'Cadastrado em', key: 'createdAt', width: 18 },
  { header: 'Aprovado em', key: 'approvedAt', width: 18 },
  { header: 'Cupom', key: 'couponCode', width: 16 },
  { header: 'Desconto do cupom (%)', key: 'couponDiscount', width: 12 },
  { header: 'Situação do cupom', key: 'couponStatus', width: 14 },
  { header: 'Nº de vendas', key: 'completedSalesCount', width: 12 },
  { header: 'Valor das vendas (R$)', key: 'completedSalesAmount', width: 18, numFmt: BRL },
  { header: 'Incentivos liberados (R$)', key: 'releasedIncentiveAmount', width: 18, numFmt: BRL },
  { header: 'Comissão paga (R$)', key: 'paidCommissionAmount', width: 18, numFmt: BRL },
];

/*
  Centavos viram reais aqui, e só aqui: a célula leva número, e não o texto
  formatado, para quem abre a planilha conseguir somar a coluna. Nulo continua
  nulo — a comissão paga ainda não existe, e zero diria que nada foi pago.
*/
function reais(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

/**
 * A planilha de afiliados do painel, como dados: as colunas e uma linha por
 * afiliado, na ordem em que a API respondeu. Montar o `.xlsx` é da rota, que é
 * quem conhece o `exceljs`.
 */
export function buildAffiliatesSheet(report: AffiliateReportRow[]): AffiliatesSheet {
  return {
    columns: COLUMNS,
    rows: report.map((row) => ({
      name: row.name,
      email: row.email,
      cpf: formatCpfDisplay(row.cpf),
      rg: row.rg,
      occupation: occupationName(row.occupation),
      socialProfile: formatSocialProfile(row.socialNetwork, row.socialHandle),
      pixKeyType: pixKeyTypeName(row.pixKeyType),
      pixKey: formatPixKeyDisplay(row.pixKeyType, row.pixKey),
      status: statusLabel(row.status),
      createdAt: formatDateTime(row.createdAt),
      approvedAt: row.approvedAt ? formatDateTime(row.approvedAt) : null,
      couponCode: row.coupon?.code ?? null,
      couponDiscount: row.coupon?.discountPercent ?? null,
      couponStatus: row.coupon
        ? row.coupon.status === CouponStatusEnum.ACTIVE
          ? 'Ativo'
          : 'Inativo'
        : null,
      completedSalesCount: row.completedSalesCount,
      completedSalesAmount: reais(row.completedSalesCents),
      releasedIncentiveAmount: reais(row.releasedIncentiveCents),
      paidCommissionAmount: reais(row.paidCommissionCents),
    })),
  };
}

// `en-CA` porque é o locale que já escreve a data como AAAA-MM-DD.
const fileDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** O dia de São Paulo: baixada às 22h, a planilha não pode sair com a data de amanhã. */
export function affiliatesSheetFileName(now: Date): string {
  return `afiliados-${fileDateFormatter.format(now)}.xlsx`;
}

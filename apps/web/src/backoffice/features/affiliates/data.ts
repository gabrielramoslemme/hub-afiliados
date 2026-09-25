import 'server-only';

import { redirect } from 'next/navigation';
import type {
  AffiliateAuditLogItem,
  AffiliateDetail,
  AffiliateListItem,
  AffiliateReportRow,
  PaginatedResult,
} from '@porto/contracts';
import { SESSION_EXPIRED_PATH } from '@/backoffice/shared/routes';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { affiliatesSheetFileName, buildAffiliatesSheet } from './lib/affiliates-sheet';
import { writeAffiliatesWorkbook } from './lib/affiliates-workbook';
import { PAGE_SIZE, type QueueParams } from './lib/queue-params';

/**
 * Backoffice de fila não pode ler cache: entre a analista abrir a lista e
 * decidir, outra pessoa pode ter decidido antes. `no-store` em toda leitura.
 */
const FRESH: RequestInit = { cache: 'no-store' };

/**
 * 401 é cookie vencido; 403 é token do outro canal. Nos dois casos a sessão não
 * serve mais, e a saída é entrar de novo — não uma tela quebrada com o erro
 * vazando para o `error.tsx`. O 404 segue reto de propósito: "afiliado não
 * encontrado" é conteúdo de tela, não problema de sessão.
 */
async function readOrSignIn<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
      redirect(SESSION_EXPIRED_PATH);
    }

    throw error;
  }
}

export function fetchAffiliates(params: QueueParams): Promise<PaginatedResult<AffiliateListItem>> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(PAGE_SIZE),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  if (params.status) query.set('status', params.status);
  if (params.occupation) query.set('occupation', params.occupation);
  if (params.search) query.set('search', params.search);

  return readOrSignIn(() =>
    authedApiFetch<PaginatedResult<AffiliateListItem>>(`/admin/affiliates?${query}`, FRESH),
  );
}

export function fetchAffiliate(publicId: string): Promise<AffiliateDetail> {
  return readOrSignIn(() =>
    authedApiFetch<AffiliateDetail>(`/admin/affiliates/${publicId}`, FRESH),
  );
}

export function fetchAuditLogs(publicId: string): Promise<AffiliateAuditLogItem[]> {
  return readOrSignIn(() =>
    authedApiFetch<AffiliateAuditLogItem[]>(`/admin/affiliates/${publicId}/audit-logs`, FRESH),
  );
}

export interface AffiliatesSheetFile {
  fileName: string;
  content: ArrayBuffer;
}

/** A planilha com todos os afiliados, já como arquivo — ignora os filtros da fila. */
export async function fetchAffiliatesSheetFile(): Promise<AffiliatesSheetFile> {
  const report = await readOrSignIn(() =>
    authedApiFetch<AffiliateReportRow[]>('/admin/affiliates/report', FRESH),
  );

  return {
    fileName: affiliatesSheetFileName(new Date()),
    content: await writeAffiliatesWorkbook(buildAffiliatesSheet(report)),
  };
}

import 'server-only';

import { redirect } from 'next/navigation';
import type {
  AffiliateMaterialsResponse,
  AffiliateMeResponse,
  AffiliateReferralsResponse,
  AffiliateWalletResponse,
  ReferralPeriodEnum,
} from '@porto/contracts';
import { AFFILIATE_SESSION_EXPIRED_PATH } from '@/affiliate/shared/routes';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { type VideoThumbnail, videoThumbnail, vimeoThumbnailFrom } from './lib/video-embed';

/**
 * Carteira, extrato e indicações não podem vir de cache: entre a pessoa abrir a
 * tela e olhar de novo, uma venda pode ter entrado ou um pagamento pode ter
 * saído.
 */
const FRESH: RequestInit = { cache: 'no-store' };

/** Mesma regra do painel: sessão recusada vira login, não tela quebrada. */
async function readOrSignIn<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
      redirect(AFFILIATE_SESSION_EXPIRED_PATH);
    }

    throw error;
  }
}

export function fetchAccount(): Promise<AffiliateMeResponse> {
  return readOrSignIn(() => affiliateApiFetch<AffiliateMeResponse>('/affiliate/me', FRESH));
}

export function fetchWallet(): Promise<AffiliateWalletResponse> {
  return readOrSignIn(() =>
    affiliateApiFetch<AffiliateWalletResponse>('/affiliate/me/wallet', FRESH),
  );
}

export function fetchReferrals(period: ReferralPeriodEnum): Promise<AffiliateReferralsResponse> {
  return readOrSignIn(() =>
    affiliateApiFetch<AffiliateReferralsResponse>(
      `/affiliate/me/referrals?period=${period}`,
      FRESH,
    ),
  );
}

export function fetchMaterials(): Promise<AffiliateMaterialsResponse> {
  return readOrSignIn(() =>
    affiliateApiFetch<AffiliateMaterialsResponse>('/affiliate/me/materials', FRESH),
  );
}

/** A capa já resolvida: o `vimeo` da `videoThumbnail` sai daqui como imagem ou como nada. */
export type ResolvedVideoThumbnail = Exclude<VideoThumbnail, { kind: 'vimeo' }>;

/*
  Um dia: a capa de um vídeo praticamente não muda, e consultar o Vimeo a cada
  abertura da aba seria pagar a volta de rede à toa.
*/
const VIMEO_OEMBED: RequestInit = { next: { revalidate: 86_400 } };
const VIMEO_TIMEOUT_MS = 2_500;

/**
 * A capa de cada módulo, por id. YouTube e arquivo saem direto do endereço; o
 * Vimeo só entrega a capa pela consulta oEmbed, que é pública e sai daqui, do
 * servidor. Falhou ou demorou, o card fica com a capa neutra — a trilha não
 * pode deixar de abrir porque o Vimeo não respondeu.
 */
export async function fetchVideoThumbnails(
  modules: ReadonlyArray<{ id: string; videoUrl: string }>,
): Promise<Record<string, ResolvedVideoThumbnail>> {
  const entries = await Promise.all(
    modules.map(async ({ id, videoUrl }): Promise<[string, ResolvedVideoThumbnail]> => {
      const thumbnail = videoThumbnail(videoUrl);
      if (thumbnail.kind !== 'vimeo') return [id, thumbnail];

      try {
        const response = await fetch(thumbnail.oembedUrl, {
          ...VIMEO_OEMBED,
          signal: AbortSignal.timeout(VIMEO_TIMEOUT_MS),
        });
        if (!response.ok) return [id, { kind: 'none' }];

        const resolved = vimeoThumbnailFrom(await response.json());
        return [id, resolved.kind === 'vimeo' ? { kind: 'none' } : resolved];
      } catch {
        return [id, { kind: 'none' }];
      }
    }),
  );

  return Object.fromEntries(entries);
}

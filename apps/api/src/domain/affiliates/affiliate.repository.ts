import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { createToken } from '@Domain/shared/token';
import { AffiliateDetail, AffiliateEntity, AffiliateWithUser } from './affiliate.entity';

export const AFFILIATE_REPOSITORY = createToken<AffiliateRepository>('AFFILIATE_REPOSITORY');

export interface ChangeAffiliateStatusInput {
  affiliateId: number;
  toStatus: AffiliateStatusEnum;
  /** Motivo registrado na trilha de auditoria. */
  reason?: string | null;
  actorUserId?: number | null;
  /** Colunas que a transição também altera, gravadas na mesma transação. */
  changes?: Partial<Pick<AffiliateEntity, 'approvedAt' | 'approvedByUserId' | 'rejectionReason'>>;
}

/**
 * União fechada, nunca `string`: o adapter interpola o nome da coluna no
 * `ORDER BY`, e um texto livre atravessando três camadas até virar SQL é a
 * forma mais discreta de abrir injeção. O compilador fecha o caminho na origem.
 */
export type AffiliateSortBy = 'createdAt' | 'name';
export type AffiliateSortOrder = 'asc' | 'desc';

export interface SearchAffiliatesInput {
  page: number;
  limit: number;
  status: AffiliateStatusEnum | null;
  /** Nome, e-mail ou CPF — o adapter decide qual pelo conteúdo. */
  search: string | null;
  sortBy: AffiliateSortBy;
  sortOrder: AffiliateSortOrder;
}

export interface SearchAffiliatesResult {
  rows: AffiliateWithUser[];
  /** Total do recorte, não da página: é o que a paginação da tela precisa. */
  total: number;
}

export interface CreateAffiliateWithUserInput {
  fullName: string;
  email: string;
  cpf: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
}

export interface AffiliateRepository {
  findByCpf(cpf: string): Promise<AffiliateEntity | null>;
  findByPublicId(publicId: string): Promise<AffiliateDetail | null>;
  findByUserId(userId: number): Promise<AffiliateWithUser | null>;
  /** A fila do painel: filtra, busca, ordena e pagina numa consulta só. */
  search(input: SearchAffiliatesInput): Promise<SearchAffiliatesResult>;
  save(affiliate: Partial<AffiliateEntity>): Promise<AffiliateEntity>;
  /**
   * Muda o status e grava o histórico na mesma transação. O status anterior sai
   * da linha travada dentro dela — recebê-lo de fora permitiria registrar uma
   * transição que nunca aconteceu.
   */
  changeStatus(input: ChangeAffiliateStatusInput): Promise<AffiliateEntity | null>;
  /**
   * Cria o usuário sem senha, o afiliado em PENDING_APPROVAL e a primeira linha
   * da trilha na mesma transação. Trilha que pode ficar de fora não é trilha, e
   * usuário órfão barraria a pessoa de se cadastrar de novo com o mesmo e-mail.
   */
  createWithUser(input: CreateAffiliateWithUserInput): Promise<AffiliateWithUser>;
}

import { AffiliateStatusEnum, PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';
import { CouponEntity } from '@Domain/coupons/coupon.entity';
import { createToken } from '@Domain/shared/token';
import { AffiliateDetail, AffiliateEntity, AffiliateWithUser } from './affiliate.entity';

export const AFFILIATE_REPOSITORY = createToken<AffiliateRepository>('AFFILIATE_REPOSITORY');

export interface ChangeAffiliateStatusInput {
  affiliateId: number;
  /**
   * O status em que a linha precisa estar quando o lock a alcança. A checagem do
   * use case vem antes e não segura nada: duas decisões simultâneas passam
   * juntas por ela, e é esta guarda que deixa só a primeira gravar.
   */
  expectedStatus: AffiliateStatusEnum;
  toStatus: AffiliateStatusEnum;
  /** Motivo registrado na trilha de auditoria. */
  reason?: string | null;
  actorUserId?: number | null;
  /** Colunas que a transição também altera, gravadas na mesma transação. */
  changes?: Partial<Pick<AffiliateEntity, 'approvedAt' | 'approvedByUserId' | 'rejectionReason'>>;
  /**
   * O cupom criado na transição, gravado na mesma transação do status e do
   * histórico — com o primeiro registro da trilha do cupom. Ele já está
   * registrado na Porto Serviços quando chega aqui: aprovado sem cupom é um
   * estado que este desenho não deixa acontecer.
   */
  coupon?: Pick<CouponEntity, 'code' | 'discountPercent' | 'status'>;
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
  rg: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  socialNetwork: SocialNetworkEnum | null;
  socialHandle: string | null;
  termsAcceptedAt: Date;
}

/**
 * Uma edição do cadastro que a trilha de auditoria registra. A união fecha quais
 * colunas passam por aqui: campo novo editável entra nela, e com isso na trilha.
 */
export interface UpdateAffiliateWithAuditInput {
  affiliateId: number;
  changes: Partial<Pick<AffiliateEntity, 'pixKeyType' | 'pixKey'>>;
  actorUserId: number | null;
}

export interface AffiliateRepository {
  findByCpf(cpf: string): Promise<AffiliateEntity | null>;
  findByRg(rg: string): Promise<AffiliateEntity | null>;
  findByPublicId(publicId: string): Promise<AffiliateDetail | null>;
  findByUserId(userId: number): Promise<AffiliateWithUser | null>;
  /** A fila do painel: filtra, busca, ordena e pagina numa consulta só. */
  search(input: SearchAffiliatesInput): Promise<SearchAffiliatesResult>;
  save(affiliate: Partial<AffiliateEntity>): Promise<AffiliateEntity>;
  /**
   * Grava a edição e a linha de `audit_logs` na mesma transação. O "antes" sai
   * da linha travada dentro dela, e sem campo que de fato mudou nada entra na
   * trilha.
   *
   * Nulo quando o afiliado não existe, e aí nada é gravado.
   */
  updateWithAudit(input: UpdateAffiliateWithAuditInput): Promise<AffiliateEntity | null>;
  /**
   * Muda o status e grava o histórico na mesma transação. O status anterior sai
   * da linha travada dentro dela — recebê-lo de fora permitiria registrar uma
   * transição que nunca aconteceu.
   *
   * Nulo quando o afiliado não existe ou já não está em `expectedStatus`: nos
   * dois casos nada é gravado, e quem decide o erro é o use case.
   *
   * Lança `CouponCodeUnavailableError` quando o código do cupom já foi gravado
   * para outro afiliado — o índice único decide a corrida que a checagem do use
   * case não segura —, e também aí nada é gravado.
   */
  changeStatus(input: ChangeAffiliateStatusInput): Promise<AffiliateEntity | null>;
  /**
   * Cria o usuário sem senha, o afiliado em PENDING_APPROVAL e a primeira linha
   * da trilha na mesma transação. Trilha que pode ficar de fora não é trilha, e
   * usuário órfão barraria a pessoa de se cadastrar de novo com o mesmo e-mail.
   */
  createWithUser(input: CreateAffiliateWithUserInput): Promise<AffiliateWithUser>;
}

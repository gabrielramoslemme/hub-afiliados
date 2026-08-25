import { AffiliateStatusEnum, PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { maskCpf } from '@Domain/affiliates/cpf.util';
import { UseCase } from '../use-case';

/**
 * O detalhe é rota própria justamente por causa do CPF e da chave PIX: eles
 * saem inteiros só quando alguém abriu aquele cadastro, nunca na listagem.
 */
export interface AffiliateDetailOutput {
  publicId: string;
  name: string;
  email: string;
  maskedCpf: string;
  cpf: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  status: AffiliateStatusEnum;
  approvedAt: Date | null;
  approvedByName: string | null;
  rejectionReason: string | null;
  createdAt: Date;
}

export class GetAffiliateUseCase implements UseCase<string, AffiliateDetailOutput> {
  constructor(private readonly affiliateRepository: AffiliateRepository) {}

  async execute(publicId: string): Promise<AffiliateDetailOutput> {
    const affiliate = await this.affiliateRepository.findByPublicId(publicId);

    if (!affiliate) throw new AffiliateNotFoundError();

    return {
      publicId: affiliate.publicId,
      name: affiliate.user.name,
      email: affiliate.user.email,
      maskedCpf: maskCpf(affiliate.cpf),
      cpf: affiliate.cpf,
      pixKeyType: affiliate.pixKeyType,
      pixKey: affiliate.pixKey,
      status: affiliate.status,
      approvedAt: affiliate.approvedAt,
      approvedByName: affiliate.approvedBy?.name ?? null,
      rejectionReason: affiliate.rejectionReason,
      createdAt: affiliate.createdAt,
    };
  }
}

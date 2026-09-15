import { AffiliateStatusEnum, PixKeyTypeEnum, SocialNetworkEnum } from '@porto/contracts';
import { maskCpf } from '@Domain/affiliates/cpf.util';
import { maskPixKey } from '@Domain/affiliates/pix-key.util';
import { maskRg } from '@Domain/affiliates/rg.util';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

/**
 * O que a própria pessoa vê da sua conta. Diferente do detalhe da analista: aqui
 * não há quem decidiu nem motivo de reprovação de terceiros, e CPF e chave PIX
 * saem mascarados — o afiliado já sabe os dele, e um dado completo numa tela
 * aberta em público não serve a ninguém.
 */
export interface AffiliateAccountOutput {
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
  coupon: string | null;
  createdAt: Date;
}

export class GetAffiliateAccountUseCase implements UseCase<string, AffiliateAccountOutput> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userPublicId: string): Promise<AffiliateAccountOutput> {
    // O `sub` do token é o `public_id` do usuário; o perfil vem carregado na
    // mesma consulta, então não há segunda ida ao banco para montar a conta.
    const user = await this.userRepository.findByPublicId(userPublicId);

    if (!user?.affiliate) throw new UnknownAffiliateError();

    const { affiliate } = user;

    return {
      publicId: affiliate.publicId,
      name: user.name,
      email: user.email,
      maskedCpf: maskCpf(affiliate.cpf),
      maskedRg: maskRg(affiliate.rg),
      socialNetwork: affiliate.socialNetwork,
      socialHandle: affiliate.socialHandle,
      pixKeyType: affiliate.pixKeyType,
      maskedPixKey: maskPixKey(affiliate.pixKeyType, affiliate.pixKey),
      status: affiliate.status,
      coupon: affiliate.coupon?.code ?? null,
      createdAt: affiliate.createdAt,
    };
  }
}

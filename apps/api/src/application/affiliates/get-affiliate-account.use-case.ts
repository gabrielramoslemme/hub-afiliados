import {
  AffiliateStatusEnum,
  OccupationEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { maskCpf } from '@Domain/affiliates/cpf.util';
import { maskPixKey } from '@Domain/affiliates/pix-key.util';
import { maskRg } from '@Domain/affiliates/rg.util';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

/**
 * O que a própria pessoa vê da sua conta. Diferente do detalhe da analista: aqui
 * não há quem decidiu nem motivo de reprovação de terceiros. CPF, RG e chave PIX
 * saem inteiros e mascarados: o perfil mostra tudo o que foi cadastrado, mas
 * abre com a máscara, e quem revela o valor é a própria pessoa.
 */
export interface AffiliateAccountOutput {
  publicId: string;
  name: string;
  email: string;
  cpf: string;
  maskedCpf: string;
  rg: string;
  maskedRg: string;
  occupation: OccupationEnum;
  socialNetwork: SocialNetworkEnum | null;
  socialHandle: string | null;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  maskedPixKey: string;
  status: AffiliateStatusEnum;
  coupon: string | null;
  /** O desconto que o cupom concede a quem compra; nulo junto com o cupom. */
  couponDiscountPercent: number | null;
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
      cpf: affiliate.cpf,
      maskedCpf: maskCpf(affiliate.cpf),
      rg: affiliate.rg,
      maskedRg: maskRg(affiliate.rg),
      occupation: affiliate.occupation,
      socialNetwork: affiliate.socialNetwork,
      socialHandle: affiliate.socialHandle,
      pixKeyType: affiliate.pixKeyType,
      pixKey: affiliate.pixKey,
      maskedPixKey: maskPixKey(affiliate.pixKeyType, affiliate.pixKey),
      status: affiliate.status,
      coupon: affiliate.coupon?.code ?? null,
      couponDiscountPercent: affiliate.coupon?.discountPercent ?? null,
      createdAt: affiliate.createdAt,
    };
  }
}

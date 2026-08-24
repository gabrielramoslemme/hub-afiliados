import { AffiliateStatusEnum, MailTemplateEnum, PixKeyTypeEnum } from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import {
  CpfAlreadyRegisteredError,
  EmailAlreadyRegisteredError,
  InvalidCpfError,
  InvalidPixKeyError,
  PixKeyMismatchError,
} from '@Domain/affiliates/affiliates.errors';
import { isValidCpf, sanitizeCpf } from '@Domain/affiliates/cpf.util';
import { isValidPixKey, normalizePixKey } from '@Domain/affiliates/pix-key.util';
import { Mailer } from '@Domain/notifications/mailer';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface CreateAffiliateInput {
  fullName: string;
  email: string;
  cpf: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
}

export interface CreateAffiliateOutput {
  publicId: string;
  status: AffiliateStatusEnum;
}

export class CreateAffiliateUseCase
  implements UseCase<CreateAffiliateInput, CreateAffiliateOutput>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly affiliateRepository: AffiliateRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute(input: CreateAffiliateInput): Promise<CreateAffiliateOutput> {
    const cpf = sanitizeCpf(input.cpf);
    if (!isValidCpf(cpf)) throw new InvalidCpfError();

    if (!isValidPixKey(input.pixKeyType, input.pixKey)) throw new InvalidPixKeyError();
    const pixKey = normalizePixKey(input.pixKeyType, input.pixKey);
    if (input.pixKeyType === PixKeyTypeEnum.CPF && pixKey !== cpf) throw new PixKeyMismatchError();

    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) throw new EmailAlreadyRegisteredError();

    const existingAffiliate = await this.affiliateRepository.findByCpf(cpf);
    if (existingAffiliate) throw new CpfAlreadyRegisteredError();

    const affiliate = await this.affiliateRepository.createWithUser({
      fullName: input.fullName,
      email: input.email,
      cpf,
      pixKeyType: input.pixKeyType,
      pixKey,
    });

    // O port nunca lança: e-mail não enviado é incidente operacional, não deve
    // reverter um cadastro que já está gravado. O destinatário vem da entrada,
    // não do retorno do `createWithUser` — o dublê de teste não precisa replicar o
    // e-mail que o adapter de verdade grava.
    await this.mailer.send({
      template: MailTemplateEnum.REGISTRATION_RECEIVED,
      to: input.email,
      toName: input.fullName,
      variables: { name: input.fullName.split(' ')[0] },
    });

    return { publicId: affiliate.publicId, status: affiliate.status };
  }
}

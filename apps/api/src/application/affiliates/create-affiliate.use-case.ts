import {
  AffiliateStatusEnum,
  MailTemplateEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { AffiliateRepository } from '@Domain/affiliates/affiliate.repository';
import {
  CpfAlreadyRegisteredError,
  EmailAlreadyRegisteredError,
  InvalidCpfError,
  InvalidPixKeyError,
  InvalidRgError,
  PixKeyMismatchError,
  RgAlreadyRegisteredError,
  TermsNotAcceptedError,
} from '@Domain/affiliates/affiliates.errors';
import { isValidCpf, sanitizeCpf } from '@Domain/affiliates/cpf.util';
import { isValidPixKey, normalizePixKey } from '@Domain/affiliates/pix-key.util';
import { isValidRg, sanitizeRg } from '@Domain/affiliates/rg.util';
import { sanitizeSocialHandle } from '@Domain/affiliates/social-handle.util';
import { Mailer } from '@Domain/notifications/mailer';
import { Clock } from '@Domain/shared/clock';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface CreateAffiliateInput {
  fullName: string;
  email: string;
  cpf: string;
  rg: string;
  pixKeyType: PixKeyTypeEnum;
  pixKey: string;
  socialNetwork?: SocialNetworkEnum | null;
  socialHandle?: string | null;
  /** Aceite do Regulamento, marcado no envio do formulário. */
  termsAccepted: boolean;
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
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateAffiliateInput): Promise<CreateAffiliateOutput> {
    /*
      Primeira coisa conferida, e antes de qualquer consulta: sem o aceite não
      há cadastro para nascer, e recusar depois de procurar CPF, RG e e-mail
      seria trabalho feito por uma entrada que já estava reprovada.
    */
    if (!input.termsAccepted) throw new TermsNotAcceptedError();

    const cpf = sanitizeCpf(input.cpf);
    if (!isValidCpf(cpf)) throw new InvalidCpfError();

    const rg = sanitizeRg(input.rg);
    if (!isValidRg(rg)) throw new InvalidRgError();

    if (!isValidPixKey(input.pixKeyType, input.pixKey)) throw new InvalidPixKeyError();
    const pixKey = normalizePixKey(input.pixKeyType, input.pixKey);
    if (input.pixKeyType === PixKeyTypeEnum.CPF && pixKey !== cpf) throw new PixKeyMismatchError();

    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) throw new EmailAlreadyRegisteredError();

    const existingAffiliate = await this.affiliateRepository.findByCpf(cpf);
    if (existingAffiliate) throw new CpfAlreadyRegisteredError();

    const affiliateWithRg = await this.affiliateRepository.findByRg(rg);
    if (affiliateWithRg) throw new RgAlreadyRegisteredError();

    // O `@` sozinho não abre perfil nenhum: sem a rede, o par inteiro é
    // descartado — e rede em branco é ausência de rede, não valor.
    const socialNetwork = input.socialNetwork || null;
    const socialHandle = socialNetwork ? sanitizeSocialHandle(input.socialHandle ?? '') : null;

    const affiliate = await this.affiliateRepository.createWithUser({
      fullName: input.fullName,
      email: input.email,
      cpf,
      rg,
      pixKeyType: input.pixKeyType,
      pixKey,
      socialNetwork,
      socialHandle,
      termsAcceptedAt: this.clock.now(),
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

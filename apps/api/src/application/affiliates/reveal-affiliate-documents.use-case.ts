import { UnknownAffiliateError, WrongPasswordError } from '@Domain/auth/auth.errors';
import { PasswordHasher } from '@Domain/auth/password-hasher';
import { UserRepository } from '@Domain/users/user.repository';
import { UseCase } from '../use-case';

export interface RevealAffiliateDocumentsInput {
  /** O `sub` do token: os documentos são sempre os de quem assinou a sessão. */
  userPublicId: string;
  currentPassword: string;
}

export interface AffiliateDocumentsOutput {
  cpf: string;
  rg: string;
  pixKey: string;
}

/**
 * CPF, RG e chave PIX inteiros, que o perfil revela a pedido da própria pessoa.
 * Saem só daqui, e não da conta, porque a conta alimenta toda tela da área do
 * afiliado: a senha atual confirma o pedido, como confirma a troca da chave, e
 * uma sessão esquecida aberta não basta para ler os documentos.
 */
export class RevealAffiliateDocumentsUseCase
  implements UseCase<RevealAffiliateDocumentsInput, AffiliateDocumentsOutput>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RevealAffiliateDocumentsInput): Promise<AffiliateDocumentsOutput> {
    const user = await this.userRepository.findByPublicId(input.userPublicId);

    if (!user?.affiliate) throw new UnknownAffiliateError();

    // O limite de tentativas desta rota é o mesmo do login: sem ele, ela seria o
    // caminho para adivinhar a senha a partir de uma sessão esquecida aberta.
    const matches = await this.passwordHasher.compare(input.currentPassword, user.password);
    if (!user.password || !matches) throw new WrongPasswordError();

    const { affiliate } = user;

    return { cpf: affiliate.cpf, rg: affiliate.rg, pixKey: affiliate.pixKey };
  }
}

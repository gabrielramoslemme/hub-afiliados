import { TermsNotPublishedError } from '@Domain/terms/terms.errors';
import { TermsVersionRepository } from '@Domain/terms/terms-version.repository';
import { UseCase } from '../use-case';

export interface GetCurrentTermsOutput {
  version: string;
  contentUrl: string;
  /** `Date`, não string: formatar para o fio é decisão do DTO de resposta. */
  publishedAt: Date;
}

export class GetCurrentTermsUseCase implements UseCase<void, GetCurrentTermsOutput> {
  constructor(private readonly termsVersionRepository: TermsVersionRepository) {}

  async execute(): Promise<GetCurrentTermsOutput> {
    const current = await this.termsVersionRepository.findCurrent();
    if (!current) throw new TermsNotPublishedError();

    // Devolver a entidade inteira entregaria o `id` serial a quem chama, e a
    // regra do repositório é que ele nunca sai. Aqui não há `public_id` para pôr
    // no lugar: a versão dos termos já é o identificador que o app conhece.
    return {
      version: current.version,
      contentUrl: current.contentUrl,
      publishedAt: current.publishedAt,
    };
  }
}

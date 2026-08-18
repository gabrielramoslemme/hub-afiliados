import { TermsVersionEntity } from './terms-version.entity';

export const TERMS_VERSION_REPOSITORY = Symbol('TERMS_VERSION_REPOSITORY');

export interface TermsVersionRepository {
  findCurrent(): Promise<TermsVersionEntity | null>;
  findById(id: number): Promise<TermsVersionEntity | null>;
}

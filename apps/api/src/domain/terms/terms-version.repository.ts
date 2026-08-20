import { createToken } from '@Domain/shared/token';
import { TermsVersionEntity } from './terms-version.entity';

export const TERMS_VERSION_REPOSITORY = createToken<TermsVersionRepository>(
  'TERMS_VERSION_REPOSITORY',
);

export interface TermsVersionRepository {
  findCurrent(): Promise<TermsVersionEntity | null>;
  findById(id: number): Promise<TermsVersionEntity | null>;
}

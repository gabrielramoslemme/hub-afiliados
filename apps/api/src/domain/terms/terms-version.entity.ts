export interface TermsVersionEntity {
  id: number;
  version: string;
  contentUrl: string;
  publishedAt: Date;
  isCurrent: boolean;
  createdAt: Date;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TermsVersionEntity } from '@Domain/terms/terms-version.entity';

@Entity('terms_versions')
@Index('uq_terms_versions_current', ['isCurrent'], { unique: true, where: '"is_current" = true' })
export class TermsVersionTypeormEntity implements TermsVersionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  version: string;

  @Column({ name: 'content_url', type: 'varchar', length: 500 })
  contentUrl: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt: Date;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

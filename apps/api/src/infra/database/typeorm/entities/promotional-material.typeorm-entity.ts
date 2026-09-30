import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaterialFileFormatEnum } from '@porto/contracts';
import { PromotionalMaterialEntity } from '@Domain/materials/promotional-material.entity';

@Entity('promotional_materials')
@Check('ck_promotional_materials_file_size_bytes', '"file_size_bytes" > 0')
@Check('ck_promotional_materials_position', '"position" > 0')
export class PromotionalMaterialTypeormEntity implements PromotionalMaterialEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ name: 'file_url', type: 'varchar', length: 2048 })
  fileUrl: string;

  @Column({ name: 'file_format', type: 'varchar', length: 10 })
  fileFormat: MaterialFileFormatEnum;

  @Column({ name: 'file_size_bytes', type: 'int' })
  fileSizeBytes: number;

  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

import { createToken } from '@Domain/shared/token';
import { PromotionalMaterialEntity, PromotionalMaterialInput } from './promotional-material.entity';

export const PROMOTIONAL_MATERIAL_REPOSITORY = createToken<PromotionalMaterialRepository>(
  'PROMOTIONAL_MATERIAL_REPOSITORY',
);

export interface PromotionalMaterialRepository {
  /** Todos, na ordem em que aparecem para o afiliado. */
  list(): Promise<PromotionalMaterialEntity[]>;
  create(input: PromotionalMaterialInput): Promise<PromotionalMaterialEntity>;
  /** Nulo quando o material não existe. */
  update(
    publicId: string,
    input: PromotionalMaterialInput,
  ): Promise<PromotionalMaterialEntity | null>;
  /** Falso quando o material não existe. */
  delete(publicId: string): Promise<boolean>;
}

import { MaterialFileFormatEnum } from '@porto/contracts';
import { PromotionalMaterialEntity } from '@Domain/materials/promotional-material.entity';

let sequence = 0;

export function buildPromotionalMaterial(
  overrides: Partial<PromotionalMaterialEntity> = {},
): PromotionalMaterialEntity {
  sequence += 1;
  return {
    id: sequence,
    publicId: `50000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    title: 'Mídia Kit',
    description: 'Baixe a cartilha com dicas e orientações de marketing para afiliados.',
    fileUrl: 'https://cdn.portoseguro.com.br/afiliados/midia-kit.pdf',
    fileFormat: MaterialFileFormatEnum.PDF,
    fileSizeBytes: 2_400_000,
    position: sequence,
    createdAt: new Date('2026-09-29T12:00:00Z'),
    updatedAt: new Date('2026-09-29T12:00:00Z'),
    ...overrides,
  };
}

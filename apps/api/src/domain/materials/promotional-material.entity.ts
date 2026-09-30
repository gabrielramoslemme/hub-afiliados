import { MaterialFileFormatEnum } from '@porto/contracts';

/**
 * Um arquivo de divulgação que o afiliado baixa. Como o vídeo da trilha, o
 * arquivo mora onde o operador o hospedou: o Hub guarda o endereço, o formato e
 * o tamanho que a tela mostra ao lado do botão.
 */
export interface PromotionalMaterialEntity {
  id: number;
  publicId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileFormat: MaterialFileFormatEnum;
  fileSizeBytes: number;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PromotionalMaterialInput = Pick<
  PromotionalMaterialEntity,
  'title' | 'description' | 'fileUrl' | 'fileFormat' | 'fileSizeBytes' | 'position'
>;

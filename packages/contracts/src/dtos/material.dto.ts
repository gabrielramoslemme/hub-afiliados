import { z } from 'zod';
import { MaterialFileFormatEnum } from '../enums';

/*
  Os materiais da aba Materiais do afiliado: a trilha de formação, em vídeo, e
  os arquivos de divulgação para baixar. O painel cadastra; o afiliado assiste,
  marca o que assistiu e baixa.

  Vídeo e arquivo não moram aqui: o operador informa a URL de onde já estão
  hospedados. O Hub guarda o endereço, nunca o arquivo.
*/

/** Um módulo da trilha, como o afiliado o vê. */
export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  durationMinutes: number;
}

/** No painel, a posição aparece: é por ela que a trilha é ordenada. */
export interface AdminTrainingModule extends TrainingModule {
  position: number;
}

/** Na área do afiliado, o módulo vem com o progresso de quem pediu. */
export interface AffiliateTrainingModule extends TrainingModule {
  completed: boolean;
}

/** Um arquivo de divulgação para baixar. */
export interface PromotionalMaterial {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileFormat: MaterialFileFormatEnum;
  /** Em bytes. Informado pelo operador: o Hub não baixa o arquivo para medir. */
  fileSizeBytes: number;
}

export interface AdminPromotionalMaterial extends PromotionalMaterial {
  position: number;
}

/** `GET /v1/affiliate/me/materials` — a aba inteira numa leitura só, cada lista em ordem. */
export interface AffiliateMaterialsResponse {
  trainingModules: AffiliateTrainingModule[];
  promotionalMaterials: PromotionalMaterial[];
}

/*
  Só https: o endereço vai para um `<iframe>`, um `<video>` ou um link de
  download na área do afiliado, e http seria conteúdo misto numa página segura.
*/
const httpsUrlField = (label: string) =>
  z
    .string({ message: `Informe a URL ${label}` })
    .trim()
    .min(1, `Informe a URL ${label}`)
    .max(2048, 'A URL pode ter até 2048 caracteres')
    .pipe(z.url({ protocol: /^https$/, message: 'Informe uma URL que comece com https://' }));

const titleField = z
  .string({ message: 'Informe o título' })
  .trim()
  .min(3, 'O título precisa de ao menos 3 caracteres')
  .max(120, 'O título pode ter até 120 caracteres');

const descriptionField = z
  .string({ message: 'Informe a descrição' })
  .trim()
  .min(3, 'A descrição precisa de ao menos 3 caracteres')
  .max(500, 'A descrição pode ter até 500 caracteres');

/**
 * `POST` e `PUT /v1/admin/training-modules` — o PUT troca o módulo inteiro. A
 * posição não vem no corpo: item novo entra no fim, e a ordem muda pela rota
 * `order`, que regrava a lista inteira de uma vez.
 */
export const trainingModuleSchema = z.object({
  title: titleField,
  description: descriptionField,
  videoUrl: httpsUrlField('do vídeo'),
  durationMinutes: z.coerce
    .number({ message: 'Informe a duração' })
    .int('A duração deve ser um número inteiro de minutos')
    .min(1, 'A duração começa em 1 minuto')
    .max(600, 'A duração vai até 600 minutos'),
});

export type TrainingModuleRequest = z.infer<typeof trainingModuleSchema>;
export type TrainingModuleFormValues = z.input<typeof trainingModuleSchema>;

/** Megabyte decimal, o mesmo do Finder e do Explorer: é com ele que o operador lê o arquivo. */
export const BYTES_PER_MEGABYTE = 1_000_000;

/** `POST` e `PUT /v1/admin/promotional-materials` — o corpo que a API recebe. */
export const promotionalMaterialSchema = z.object({
  title: titleField,
  description: descriptionField,
  fileUrl: httpsUrlField('do arquivo'),
  fileFormat: z.enum(MaterialFileFormatEnum, { message: 'Escolha o formato do arquivo' }),
  fileSizeBytes: z
    .number({ message: 'Informe o tamanho do arquivo' })
    .int('O tamanho deve ser um número inteiro de bytes')
    .min(1, 'Informe o tamanho do arquivo')
    .max(2_000 * BYTES_PER_MEGABYTE, 'O arquivo pode ter até 2000 MB'),
});

export type PromotionalMaterialRequest = z.infer<typeof promotionalMaterialSchema>;

/*
  O formulário pede o tamanho em MB, que é como o operador o conhece, e entrega
  à API em bytes. A conversão mora no schema para o formulário e o Server Action
  não fazerem a conta cada um do seu jeito.
*/
export const promotionalMaterialFormSchema = promotionalMaterialSchema
  .omit({ fileSizeBytes: true })
  .extend({
    fileSizeMegabytes: z.coerce
      .number({ message: 'Informe o tamanho em MB' })
      .positive('Informe o tamanho em MB')
      .max(2_000, 'O arquivo pode ter até 2000 MB'),
  })
  .transform(({ fileSizeMegabytes, ...material }) => ({
    ...material,
    fileSizeBytes: Math.round(fileSizeMegabytes * BYTES_PER_MEGABYTE),
  }));

export type PromotionalMaterialFormValues = z.input<typeof promotionalMaterialFormSchema>;

/**
 * `PUT /v1/admin/training-modules/order` e `/promotional-materials/order` — a
 * lista inteira, na ordem nova. Inteira, e não "o item X foi para a posição Y":
 * a API confere que são exatamente os itens que existem, e recusa a ordem se
 * alguém criou ou apagou um item enquanto a tela estava aberta.
 */
export const reorderMaterialsSchema = z.object({
  ids: z
    .array(z.uuid({ message: 'Item inválido na ordem' }))
    .min(1, 'Informe a ordem dos itens')
    .max(999, 'A lista vai até 999 itens')
    .refine((ids) => new Set(ids).size === ids.length, 'A ordem repete um item'),
});

export type ReorderMaterialsRequest = z.infer<typeof reorderMaterialsSchema>;

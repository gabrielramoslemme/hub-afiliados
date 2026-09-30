/**
 * Um vídeo da trilha de formação do afiliado. O vídeo mora onde o operador o
 * hospedou; aqui fica o endereço e o que a tela precisa para listá-lo.
 */
export interface TrainingModuleEntity {
  id: number;
  publicId: string;
  title: string;
  description: string;
  videoUrl: string;
  durationMinutes: number;
  /** A ordem da trilha. Não é única: dois módulos na mesma posição desempatam pela criação. */
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

/** O que o operador escreve. O resto a tabela preenche. */
export type TrainingModuleInput = Pick<
  TrainingModuleEntity,
  'title' | 'description' | 'videoUrl' | 'durationMinutes' | 'position'
>;

/** Um módulo que o afiliado marcou como assistido. */
export interface TrainingModuleCompletionEntity {
  affiliateId: number;
  trainingModuleId: number;
  completedAt: Date;
}

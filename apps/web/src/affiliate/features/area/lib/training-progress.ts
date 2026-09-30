export interface TrainingProgress {
  completed: number;
  total: number;
  percent: number;
}

/**
 * Quanto da trilha o afiliado já assistiu, arredondado — mas nunca 100% antes
 * do último módulo: 199 de 200 arredondaria para a barra cheia, e ela fica para
 * quem de fato terminou.
 */
export function trainingProgress(modules: ReadonlyArray<{ completed: boolean }>): TrainingProgress {
  const completed = modules.filter((module) => module.completed).length;
  const total = modules.length;

  if (total === 0) return { completed, total, percent: 0 };

  const percent = Math.round((completed / total) * 100);
  return { completed, total, percent: completed < total ? Math.min(percent, 99) : 100 };
}

import { trainingProgress } from './training-progress';

describe('trainingProgress', () => {
  it('counts the watched modules over the whole track', () => {
    expect(
      trainingProgress([{ completed: true }, { completed: false }, { completed: true }]),
    ).toEqual({ completed: 2, total: 3, percent: 67 });
  });

  /* Sem módulo nenhum não há o que concluir: a barra fica vazia, não em 100% nem em NaN. */
  it('answers zero percent for an empty track', () => {
    expect(trainingProgress([])).toEqual({ completed: 0, total: 0, percent: 0 });
  });

  it('only reaches 100% when every module is watched', () => {
    const almost = Array.from({ length: 200 }, (_, index) => ({ completed: index > 0 }));

    expect(trainingProgress(almost).percent).toBe(99);
  });
});

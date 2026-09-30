import { MaterialFileFormatEnum } from '@porto/contracts';
import { nextPosition, promotionalMaterialFormDefaults } from './material-form';

describe('nextPosition', () => {
  /* O item novo entra no fim da lista, que é onde a Porto costuma acrescentar módulo. */
  it('places a new item after the last one', () => {
    expect(nextPosition([{ position: 1 }, { position: 4 }, { position: 2 }])).toBe(5);
  });

  it('starts at one on an empty list', () => {
    expect(nextPosition([])).toBe(1);
  });
});

describe('promotionalMaterialFormDefaults', () => {
  it('hands the size back in megabytes for editing', () => {
    expect(
      promotionalMaterialFormDefaults({
        id: '50000000-0000-4000-8000-000000000001',
        title: 'Mídia Kit',
        description: 'Cartilha',
        fileUrl: 'https://cdn.example.com/kit.pdf',
        fileFormat: MaterialFileFormatEnum.PDF,
        fileSizeBytes: 2_400_000,
        position: 1,
      }).fileSizeMegabytes,
    ).toBe(2.4);
  });
});

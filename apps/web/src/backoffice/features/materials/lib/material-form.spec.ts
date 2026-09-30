import { MaterialFileFormatEnum } from '@porto/contracts';
import { promotionalMaterialFormDefaults } from './material-form';

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

  /* A posição não é do formulário: sair dele no PUT seria campo fora do DTO, e 400. */
  it('leaves the position out of the form', () => {
    expect(
      promotionalMaterialFormDefaults({
        id: '50000000-0000-4000-8000-000000000001',
        title: 'Mídia Kit',
        description: 'Cartilha',
        fileUrl: 'https://cdn.example.com/kit.pdf',
        fileFormat: MaterialFileFormatEnum.PDF,
        fileSizeBytes: 2_400_000,
        position: 3,
      }),
    ).not.toHaveProperty('position');
  });
});

import { revalidatePath } from 'next/cache';
import { MaterialFileFormatEnum } from '@porto/contracts';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import {
  deletePromotionalMaterial,
  reorderPromotionalMaterials,
  savePromotionalMaterial,
} from './promotional-material.action';

jest.mock('@/shared/http/api-client', () => ({ authedApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const apiFetch = authedApiFetch as jest.MockedFunction<typeof authedApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const MATERIAL_ID = '50000000-0000-4000-8000-000000000001';

const form = {
  title: 'Criativos Estáticos',
  description: 'Baixe os materiais visuais prontos para uso em suas campanhas.',
  fileUrl: 'https://cdn.example.com/afiliados/criativos.zip',
  fileFormat: MaterialFileFormatEnum.ZIP,
  fileSizeMegabytes: '18.7',
};

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue({});
});

describe('savePromotionalMaterial', () => {
  /* O operador pensa em MB; a API guarda bytes. A conta sai do schema, num lugar só. */
  it('sends the size in bytes although the form asks for megabytes', async () => {
    await savePromotionalMaterial(null, form);

    expect(apiFetch).toHaveBeenCalledWith('/admin/promotional-materials', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Criativos Estáticos',
        description: 'Baixe os materiais visuais prontos para uso em suas campanhas.',
        fileUrl: 'https://cdn.example.com/afiliados/criativos.zip',
        fileFormat: 'ZIP',
        fileSizeBytes: 18_700_000,
      }),
    });
  });

  it('replaces the existing material when it has an id', async () => {
    await savePromotionalMaterial(MATERIAL_ID, form);

    expect(apiFetch).toHaveBeenCalledWith(
      `/admin/promotional-materials/${MATERIAL_ID}`,
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(revalidate).toHaveBeenCalledWith('/admin/materiais');
  });

  it('refuses a format outside the list without calling the api', async () => {
    await expect(savePromotionalMaterial(null, { ...form, fileFormat: 'EXE' })).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { fileFormat: 'Escolha o formato do arquivo' },
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('points the size error at the field the operator typed', async () => {
    await expect(
      savePromotionalMaterial(null, { ...form, fileSizeMegabytes: '0' }),
    ).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { fileSizeMegabytes: 'Informe o tamanho em MB' },
    });
  });

  it('reports the api message when the api refuses the material', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, null, 'Material de divulgação não encontrado.'));

    await expect(savePromotionalMaterial(MATERIAL_ID, form)).resolves.toEqual({
      status: 'failed',
      message: 'Material de divulgação não encontrado.',
    });
  });
});

describe('deletePromotionalMaterial', () => {
  it('deletes the material and refreshes the materials screen', async () => {
    await expect(deletePromotionalMaterial(MATERIAL_ID)).resolves.toEqual({ status: 'success' });

    expect(apiFetch).toHaveBeenCalledWith(`/admin/promotional-materials/${MATERIAL_ID}`, {
      method: 'DELETE',
    });
    expect(revalidate).toHaveBeenCalledWith('/admin/materiais');
  });
});

describe('reorderPromotionalMaterials', () => {
  it('sends every material in the new order and refreshes the screen', async () => {
    const order = ['50000000-0000-4000-8000-000000000002', MATERIAL_ID];

    await expect(reorderPromotionalMaterials(order)).resolves.toEqual({ status: 'success' });

    expect(apiFetch).toHaveBeenCalledWith('/admin/promotional-materials/order', {
      method: 'PUT',
      body: JSON.stringify({ ids: order }),
    });
    expect(revalidate).toHaveBeenCalledWith('/admin/materiais');
  });
});

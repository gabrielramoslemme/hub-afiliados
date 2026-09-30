import { revalidatePath } from 'next/cache';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { deleteTrainingModule, saveTrainingModule } from './training-module.action';

jest.mock('@/shared/http/api-client', () => ({ authedApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const apiFetch = authedApiFetch as jest.MockedFunction<typeof authedApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const MODULE_ID = '40000000-0000-4000-8000-000000000001';

/* O que o formulário entrega: os números chegam como string do `input[type=number]`. */
const form = {
  title: '  Módulo 2 - Encanador ',
  description: 'Vazamentos visíveis em torneiras, sifões ou tubulações?',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  durationMinutes: '6',
  position: '2',
};

const body = {
  title: 'Módulo 2 - Encanador',
  description: 'Vazamentos visíveis em torneiras, sifões ou tubulações?',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  durationMinutes: 6,
  position: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue({ id: MODULE_ID, ...body });
});

describe('saveTrainingModule', () => {
  it('creates a new module with the values the api expects', async () => {
    await expect(saveTrainingModule(null, form)).resolves.toEqual({ status: 'success' });

    expect(apiFetch).toHaveBeenCalledWith('/admin/training-modules', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });

  it('replaces the existing module when it has an id', async () => {
    await saveTrainingModule(MODULE_ID, form);

    expect(apiFetch).toHaveBeenCalledWith(`/admin/training-modules/${MODULE_ID}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  });

  it('refreshes the materials screen once saved', async () => {
    await saveTrainingModule(null, form);

    expect(revalidate).toHaveBeenCalledWith('/admin/materiais');
  });

  it('refuses a video address that is not https without calling the api', async () => {
    await expect(
      saveTrainingModule(null, { ...form, videoUrl: 'http://www.youtube.com/watch?v=x' }),
    ).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { videoUrl: 'Informe uma URL que comece com https://' },
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('refuses an id that is not a uuid without calling the api', async () => {
    await expect(saveTrainingModule('../../affiliates', form)).resolves.toEqual({
      status: 'failed',
      message: 'Módulo não encontrado. Atualize a página e tente de novo.',
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('reports the api message when the api refuses the module', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, null, 'Módulo da trilha não encontrado.'));

    await expect(saveTrainingModule(MODULE_ID, form)).resolves.toEqual({
      status: 'failed',
      message: 'Módulo da trilha não encontrado.',
    });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('hides an unexpected failure behind a message to try again', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(saveTrainingModule(null, form)).resolves.toEqual({
      status: 'failed',
      message: 'Não foi possível salvar o módulo. Tente novamente.',
    });
  });
});

describe('deleteTrainingModule', () => {
  it('deletes the module and refreshes the materials screen', async () => {
    await expect(deleteTrainingModule(MODULE_ID)).resolves.toEqual({ status: 'success' });

    expect(apiFetch).toHaveBeenCalledWith(`/admin/training-modules/${MODULE_ID}`, {
      method: 'DELETE',
    });
    expect(revalidate).toHaveBeenCalledWith('/admin/materiais');
  });

  it('refuses an id that is not a uuid without calling the api', async () => {
    await deleteTrainingModule('');

    expect(apiFetch).not.toHaveBeenCalled();
  });
});

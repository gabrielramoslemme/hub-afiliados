import { fetchMaterials, fetchVideoThumbnails } from '../data';
import { DownloadList } from './download-list';
import { PageHeading } from './page-heading';
import { TrainingTrack } from './training-track';

/** A aba Materiais: a trilha de formação em vídeo e os arquivos para divulgar o cupom. */
export async function MaterialsScreen() {
  const { trainingModules, promotionalMaterials } = await fetchMaterials();
  const thumbnails = await fetchVideoThumbnails(trainingModules);

  return (
    <>
      <PageHeading title="Materiais" lead="Trilha de formação e recursos para divulgação." />

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start">
        <TrainingTrack modules={trainingModules} thumbnails={thumbnails} />
        <DownloadList materials={promotionalMaterials} />
      </div>
    </>
  );
}

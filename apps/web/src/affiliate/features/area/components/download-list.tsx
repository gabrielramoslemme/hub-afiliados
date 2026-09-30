import { Download } from 'lucide-react';
import type { PromotionalMaterial } from '@porto/contracts';
import { FileFormatIcon } from '@/shared/components/file-format-icon';
import { Button } from '@/shared/components/ui/button';
import { formatFileSize } from '@/shared/lib/format';

/**
 * Os arquivos que a Porto disponibiliza. O download sai direto do endereço onde
 * ela os hospeda: o Hub não guarda nem intermedeia o arquivo.
 */
export function DownloadList({ materials }: { materials: PromotionalMaterial[] }) {
  return (
    <section aria-labelledby="downloads-title" className="animate-rise [animation-delay:120ms]">
      <h2 id="downloads-title" className="font-semibold text-ink-900">
        Downloads
      </h2>
      <p className="mt-1 text-[0.875rem] text-ink-500">
        Materiais prontos para consulta e uso nas suas campanhas.
      </p>

      {materials.length === 0 ? (
        <p className="mt-4 rounded-panel border border-dashed border-ink-300 bg-white p-6 text-[0.9375rem] text-ink-500">
          Os materiais de divulgação da Porto Serviço vão aparecer aqui para você baixar.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {materials.map((material) => {
            return (
              <li
                key={material.id}
                className="rounded-panel border border-ink-200 bg-white p-5 shadow-card"
              >
                <div className="flex items-start gap-3.5">
                  <FileFormatIcon format={material.fileFormat} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink-900">{material.title}</h3>
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-500">
                      {material.description}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-[0.75rem] text-ink-500">
                      <span className="rounded-sm bg-ink-100 px-1.5 py-0.5 font-semibold text-ink-700">
                        {material.fileFormat}
                      </span>
                      <span data-tabular>{formatFileSize(material.fileSizeBytes)}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button asChild size="sm">
                    <a href={material.fileUrl} target="_blank" rel="noreferrer" download>
                      <Download aria-hidden />
                      Baixar
                      <span className="sr-only">
                        {material.title} ({material.fileFormat},{' '}
                        {formatFileSize(material.fileSizeBytes)})
                      </span>
                    </a>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

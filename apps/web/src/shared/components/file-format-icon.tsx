import { FileArchive, FileImage, FileText, FileVideo, type LucideIcon } from 'lucide-react';
import { MaterialFileFormatEnum } from '@porto/contracts';
import { cn } from '@/shared/lib/cn';

const FORMATS: Record<MaterialFileFormatEnum, { icon: LucideIcon; tile: string }> = {
  [MaterialFileFormatEnum.PDF]: {
    icon: FileText,
    tile: 'bg-[var(--status-approved-surface)] text-[var(--status-approved)]',
  },
  [MaterialFileFormatEnum.ZIP]: { icon: FileArchive, tile: 'bg-blue-50 text-blue-600' },
  [MaterialFileFormatEnum.PNG]: { icon: FileImage, tile: 'bg-blue-50 text-blue-600' },
  [MaterialFileFormatEnum.JPG]: { icon: FileImage, tile: 'bg-blue-50 text-blue-600' },
  [MaterialFileFormatEnum.MP4]: { icon: FileVideo, tile: 'bg-blue-50 text-blue-600' },
};

/**
 * O azulejo do formato de um material, o mesmo no painel e nos Downloads do
 * afiliado: quem cadastra vê o arquivo do jeito que ele vai aparecer.
 */
export function FileFormatIcon({
  format,
  className,
}: {
  format: MaterialFileFormatEnum;
  className?: string;
}) {
  const { icon: Icon, tile } = FORMATS[format];

  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-card',
        tile,
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

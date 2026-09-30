import { Skeleton } from '@/shared/components/ui/skeleton';

const MODULES = ['a', 'b', 'c', 'd', 'e'];
const FILES = ['a', 'b'];

export default function MaterialsLoading() {
  return (
    <>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-3 h-5 w-full max-w-2xl" />

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start">
        {[MODULES, FILES].map((rows) => (
          <div key={rows.length} className="rounded-panel border border-ink-200 bg-white">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-9 w-32" />
            </div>
            {rows.map((row) => (
              <div key={row} className="flex items-start gap-4 border-b border-ink-200 px-5 py-4">
                <Skeleton className="size-8 shrink-0 rounded-pill" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

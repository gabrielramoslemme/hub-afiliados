import { Skeleton } from '@/shared/components/ui/skeleton';

const ROWS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function CampaignsLoading() {
  return (
    <>
      <Skeleton className="h-8 w-52" />
      <Skeleton className="mt-3 h-5 w-full max-w-2xl" />

      <Skeleton className="mt-8 h-40 rounded-panel" />

      <div className="mt-8 overflow-hidden rounded-panel border border-ink-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <Skeleton className="h-10 w-[26rem] rounded-pill" />
          <Skeleton className="h-9 w-64" />
        </div>

        {ROWS.map((row) => (
          <div key={row} className="flex items-center gap-6 border-b border-ink-200 px-4 py-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="size-8 shrink-0" />
          </div>
        ))}
      </div>
    </>
  );
}

import { Skeleton } from '@/shared/components/ui/skeleton';

export default function AffiliatesQueueLoading() {
  return (
    <>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-5 w-full max-w-xl" />

      <div className="mt-8 flex items-center justify-between">
        <Skeleton className="h-9 w-96" />
        <Skeleton className="h-9 w-80" />
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-ink-200 bg-white">
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((row) => (
          <div key={row} className="flex items-center gap-6 border-b border-ink-200 px-4 py-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </>
  );
}

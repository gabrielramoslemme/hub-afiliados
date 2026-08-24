export function PageHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-ink-900 lg:text-3xl">{title}</h1>
      <p className="mt-1.5 text-[0.9375rem] text-ink-500">{lead}</p>
    </div>
  );
}

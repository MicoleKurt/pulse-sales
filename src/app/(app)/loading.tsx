export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-[var(--radius-card)] bg-surface-2" />
        ))}
      </div>
      <div className="h-80 rounded-[var(--radius-card)] bg-surface-2" />
    </div>
  );
}

export function LiveChannelGridSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="live-card">
            <div className="live-card-thumb animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    </section>
  );
}

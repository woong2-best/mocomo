export function LiveChannelGridSkeleton() {
  return (
    <div className="space-y-8">
      <div className="aspect-video rounded-2xl bg-muted animate-pulse" />
      <section className="space-y-3">
        <div className="h-5 w-36 rounded bg-muted animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 w-32 shrink-0 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <div className="h-5 w-28 rounded bg-muted animate-pulse" />
        <div className="rounded-xl border border-border/50 px-3 sm:px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3 py-3 border-b border-border/40 last:border-0">
              <div className="w-[128px] sm:w-[148px] aspect-video shrink-0 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-full max-w-md rounded bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

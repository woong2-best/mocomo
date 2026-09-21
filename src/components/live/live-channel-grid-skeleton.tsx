export function LiveChannelGridSkeleton() {
  return (
    <div
      className="flex flex-row gap-3 flex-1 w-full min-h-0"
      style={{ minHeight: "clamp(320px, calc(100dvh - 160px), 720px)" }}
    >
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <div className="aspect-video rounded-xl bg-white/10 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-white/10 animate-pulse" />
            <div className="h-2.5 w-1/2 rounded bg-white/10 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="w-[140px] shrink-0 rounded-b-[1.75rem] bg-white animate-pulse" />
    </div>
  );
}

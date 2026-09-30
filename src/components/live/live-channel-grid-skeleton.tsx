export function LiveChannelGridSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="h-[234px] w-full max-w-full overflow-hidden rounded bg-white/[0.06] animate-pulse" />
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-xl bg-white/[0.08] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

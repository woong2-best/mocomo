export function LiveChannelGridSkeleton() {
  return (
    <div
      className="flex flex-row gap-3 flex-1 w-full min-h-0"
      style={{ minHeight: "clamp(220px, calc(100dvh - 270px), 680px)" }}
    >
      <div className="flex-1 min-w-0 rounded-2xl bg-muted animate-pulse" />
      <div className="w-[200px] shrink-0 rounded-2xl bg-muted/80 animate-pulse" />
    </div>
  );
}

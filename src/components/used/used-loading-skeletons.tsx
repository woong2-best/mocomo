/** 중고거래 라우트 전환용 스켈레톤 */

export function UsedFeedSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-4 border-y border-border/60">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-card ring-1 ring-inset ring-border/50">
          <div className="aspect-square bg-muted animate-pulse" />
          <div className="p-1.5 space-y-1">
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsedMySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0">
            <div className="aspect-square bg-muted" />
            <div className="aspect-square bg-muted" />
            <div className="aspect-square bg-muted hidden sm:block" />
            <div className="aspect-square bg-muted hidden lg:block" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsedDetailSkeleton() {
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-pulse pb-nav lg:pb-6">
      <div className="aspect-[4/5] rounded-2xl bg-muted" />
      <div className="h-6 w-2/3 rounded-lg bg-muted" />
      <div className="h-8 w-1/3 rounded-lg bg-muted" />
      <div className="h-20 rounded-xl bg-muted" />
    </div>
  );
}

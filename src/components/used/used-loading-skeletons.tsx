/** 중고거래 라우트 전환용 스켈레톤 */

export function UsedFeedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square rounded-xl bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square rounded-xl bg-muted" />
            <div className="aspect-square rounded-xl bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsedDetailSkeleton() {
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-pulse pb-24">
      <div className="aspect-[4/5] rounded-2xl bg-muted" />
      <div className="h-6 w-2/3 rounded-lg bg-muted" />
      <div className="h-8 w-1/3 rounded-lg bg-muted" />
      <div className="h-20 rounded-xl bg-muted" />
    </div>
  );
}

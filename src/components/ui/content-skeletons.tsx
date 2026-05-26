/** 본문 로딩 — loading.tsx 이후에도 구역별로 스트리밍 */

export function GridCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-40 rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="animate-pulse border-b border-border/60 p-4 space-y-4">
      <div className="flex gap-4">
        <div className="h-20 w-20 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2 pt-2">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </div>
      </div>
      <div className="h-9 w-full rounded-xl bg-muted" />
    </div>
  );
}

export function ProfileTimelineSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-border/40">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div className="h-14 border-b border-border/60 bg-muted/20 animate-pulse flex items-center gap-3 px-4">
      <div className="h-9 w-9 rounded-full bg-muted" />
      <div className="h-4 w-28 rounded bg-muted" />
    </div>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div className="flex-1 min-h-0 bg-muted/10 animate-pulse p-4 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-10 rounded-2xl bg-muted max-w-[70%] ${i % 2 === 0 ? "" : "ml-auto"}`}
        />
      ))}
    </div>
  );
}

export function CardRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function MarketGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

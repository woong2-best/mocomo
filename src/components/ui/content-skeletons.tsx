import { avatarShapeClass } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

/** 커뮤니티 허브 — 카테고리 탭 + 피처드 + 목록 */
export function CommunitiesHubSkeleton() {
  return (
    <div className="overflow-hidden rounded-sm border border-border animate-pulse">
      <div className="h-10 bg-muted/60 border-b border-border" />
      <div className="h-9 bg-muted/40 border-b border-border" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/40">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[4/3] bg-muted" />
        ))}
      </div>
      <div className="space-y-0 border-t border-border">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
            <div className="h-12 w-12 bg-muted shrink-0" />
            <div className="h-4 flex-1 bg-muted rounded" />
            <div className="hidden sm:block h-3 w-12 bg-muted rounded" />
            <div className="h-3 w-10 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="animate-pulse border-b border-border/60 p-4 space-y-4">
      <div className="flex gap-4">
        <div className={cn("h-20 w-20 bg-muted shrink-0", avatarShapeClass)} />
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
    <div className="animate-pulse divide-y divide-border/40" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 px-4 py-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-3 w-full max-w-md rounded bg-muted" />
            <div className="h-3 w-4/5 max-w-sm rounded bg-muted" />
            {i === 1 ? <div className="mt-2 h-48 w-full max-w-lg rounded-2xl bg-muted" /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div className="h-14 border-b border-border/60 bg-muted/20 animate-pulse flex items-center gap-3 px-4">
      <div className={cn("h-9 w-9 bg-muted", avatarShapeClass)} />
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
    <div className="space-y-5 animate-pulse">
      <div className="h-12 rounded-xl bg-muted" />
      <div className="h-[280px] rounded-2xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square rounded-xl bg-muted" />
            <div className="h-3 w-4/5 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-7 w-2/3 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabPanelSkeleton() {
  return (
    <div className="space-y-3 animate-pulse py-2">
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="h-20 rounded-2xl bg-muted" />
    </div>
  );
}

import { cn } from "@/lib/utils";

/** Static empty card (user asset) — when the live hub has zero active broadcasts. */
export const LIVE_NO_BROADCAST_EMPTY_SRC = "/images/live/no-broadcast-empty.png?v=2";

export function LiveNoBroadcastEmpty({
  className,
  alt = "방송중인 방송이 없습니다",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <div className={cn("group block min-w-0", className)}>
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/15 shadow-sm bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LIVE_NO_BROADCAST_EMPTY_SRC}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
        />
      </div>
    </div>
  );
}

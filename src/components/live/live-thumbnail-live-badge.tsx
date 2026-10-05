import { cn } from "@/lib/utils";

/** Green on-air pill on hub / grid thumbnails — red dot + LIVE label. */
export function LiveThumbnailLiveBadge({ className }: { className?: string }) {
  return (
    <span className={cn("live-badge !bg-emerald-600", className)}>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500 ring-1 ring-red-400/80"
        aria-hidden
      />
      LIVE
    </span>
  );
}

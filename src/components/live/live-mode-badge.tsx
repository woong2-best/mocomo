import { Video } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveModeBadge({
  broadcastMode: _broadcastMode,
  className,
  compact,
}: {
  broadcastMode?: string | null;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-medium text-white bg-folk-terracotta/90",
        compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5",
        className
      )}
    >
      <Video className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      라이브
    </span>
  );
}

import { Mic2, Video } from "lucide-react";
import { isVoiceBroadcastMode } from "@/lib/live-voice-broadcast";
import { cn } from "@/lib/utils";

export function LiveModeBadge({
  broadcastMode,
  className,
  compact,
}: {
  broadcastMode?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const voice = isVoiceBroadcastMode(broadcastMode);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-medium text-white",
        voice ? "bg-violet-600/90" : "bg-folk-terracotta/90",
        compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5",
        className
      )}
    >
      {voice ? <Mic2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> : <Video className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {voice ? "보이스" : "라이브"}
    </span>
  );
}

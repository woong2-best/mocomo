import { BadgeCheck } from "lucide-react";
import {
  creatorBadgeFromFollowerCount,
  getCreatorFollowerBadgeDef,
  type CreatorFollowerBadgeId,
} from "@/lib/creator-follower-badge";
import { cn } from "@/lib/utils";

export function CreatorFollowerBadge({
  badge,
  followerCount,
  size = "sm",
  showLabel = true,
  className,
}: {
  badge?: CreatorFollowerBadgeId | null;
  followerCount?: number;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const resolved = badge ?? (followerCount != null ? creatorBadgeFromFollowerCount(followerCount) : null);
  if (!resolved) return null;

  const def = getCreatorFollowerBadgeDef(resolved);
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 shrink-0 font-semibold",
        textSize,
        className
      )}
      style={{ color: def.color }}
      title={`크리에이터 ${def.labelKo} · 팔로워 ${def.minFollowers.toLocaleString()}명+`}
    >
      <BadgeCheck className={iconSize} aria-hidden />
      {showLabel && <span>{def.labelKo}</span>}
    </span>
  );
}

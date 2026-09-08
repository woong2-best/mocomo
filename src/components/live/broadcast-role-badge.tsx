import Image from "next/image";
import { Crown, Shield, Sparkles } from "lucide-react";
import type { EffectiveBroadcastRole } from "@/lib/live-broadcast/permissions";
import { broadcastRoleLabelKo, MANAGER_CHAT_COLOR } from "@/lib/live-broadcast/permissions";
import { cn } from "@/lib/utils";

export function BroadcastRoleBadge({
  role,
  className,
  size = 16,
}: {
  role: EffectiveBroadcastRole;
  className?: string;
  size?: number;
}) {
  if (role === "VIEWER") return null;

  if (role === "MANAGER") {
    return (
      <Image
        src="/images/live/manager-badge.png"
        alt={broadcastRoleLabelKo(role)}
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
        title={broadcastRoleLabelKo(role)}
      />
    );
  }

  if (role === "OWNER") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-sm bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0",
          className
        )}
        title={broadcastRoleLabelKo(role)}
      >
        <Crown className="h-3.5 w-3.5" style={{ width: size * 0.75, height: size * 0.75 }} />
      </span>
    );
  }

  if (role === "MODERATOR") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0",
          className
        )}
        title={broadcastRoleLabelKo(role)}
      >
        <Shield className="h-3.5 w-3.5" style={{ width: size * 0.75, height: size * 0.75 }} />
      </span>
    );
  }

  if (role === "VIP") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-sm bg-violet-500/15 text-violet-600 dark:text-violet-400 shrink-0",
          className
        )}
        title={broadcastRoleLabelKo(role)}
      >
        <Sparkles className="h-3.5 w-3.5" style={{ width: size * 0.75, height: size * 0.75 }} />
      </span>
    );
  }

  return null;
}

export function broadcastRoleChatColor(role?: EffectiveBroadcastRole): string | undefined {
  if (role === "MANAGER") return MANAGER_CHAT_COLOR;
  if (role === "OWNER") return "#f59e0b";
  if (role === "MODERATOR") return "#10b981";
  if (role === "VIP") return "#8b5cf6";
  return undefined;
}

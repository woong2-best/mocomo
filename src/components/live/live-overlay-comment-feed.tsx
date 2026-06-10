"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LiveChatMessage } from "@/components/live/live-chat";
import { cn } from "@/lib/utils";

/** 세로 라이브 / 인스타 스타일 — 아바타 + 닉네임 + 댓글 한 줄 */
export function LiveOverlayCommentFeed({
  messages,
  className,
  avatarSize = "md",
}: {
  messages: LiveChatMessage[];
  className?: string;
  avatarSize?: "sm" | "md";
}) {
  if (messages.length === 0) return null;

  const avatarClass = avatarSize === "sm" ? "h-6 w-6" : "h-7 w-7";
  const textClass = avatarSize === "sm" ? "text-[13px]" : "text-sm";

  return (
    <div className={cn("flex flex-col items-start gap-2.5 w-full min-w-0", className)}>
      {messages.map((m) => (
        <div
          key={m.id}
          className="flex items-start gap-2 w-full max-w-[min(100%,20rem)] shrink-0"
        >
          <Avatar className={cn(avatarClass, "shrink-0 border border-white/25 shadow-sm")}>
            <AvatarImage src={m.image ?? undefined} />
            <AvatarFallback className="text-[9px] bg-black/50 text-white">
              {m.username[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <p
            className={cn(
              textClass,
              "text-white leading-snug break-words min-w-0 pt-0.5",
              "drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
            )}
          >
            <span className="font-bold mr-1.5 align-baseline">{m.username}</span>
            <span className="font-normal align-baseline">{m.content}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

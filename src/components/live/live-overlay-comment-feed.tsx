"use client";

import type { LiveChatMessage } from "@/components/live/live-chat";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { chatOverlayUsernameColor } from "@/lib/live/chat-overlay-username-color";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** 세로 라이브 / VTuber 스타일 채팅 오버레이 */
export function LiveOverlayCommentFeed({
  messages,
  className,
  avatarSize = "md",
  variant = "default",
}: {
  messages: LiveChatMessage[];
  className?: string;
  avatarSize?: "sm" | "md";
  /** vtuber — 투명 배경·컬러 닉네임·프로필 없음 (화면공유+2D 방송) */
  variant?: "default" | "vtuber";
}) {
  if (messages.length === 0) return null;

  if (variant === "vtuber") {
    return (
      <div className={cn("flex flex-col items-start gap-1.5 w-full min-w-0", className)}>
        {messages.map((m) => (
          <p
            key={m.id}
            className={cn(
              "text-[13px] sm:text-sm leading-snug break-words w-full",
              "drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
            )}
          >
            <span
              className="font-bold mr-1"
              style={{ color: chatOverlayUsernameColor(m.username) }}
            >
              {m.username}
            </span>
            <span className="text-white/95 font-normal">{m.content}</span>
          </p>
        ))}
      </div>
    );
  }

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
            <DisplayNameWithSupportTier
              name={<span className="font-bold">{m.username}</span>}
              tier={m.supportTierSent ?? "SEED"}
              compact={false}
              className="inline-flex mr-1.5 align-baseline"
            />
            <span className="font-normal align-baseline">{m.content}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

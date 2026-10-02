"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { getGameShareCardMeta } from "@/lib/activities/game-share-meta";
import type { ParsedChatGameShare } from "@/lib/chat-game-share";
import { cn } from "@/lib/utils";

type Props = {
  share: ParsedChatGameShare;
  isMine?: boolean;
  className?: string;
};

export function ChatGameShareCard({ share, isMine = false, className }: Props) {
  const meta = getGameShareCardMeta(share);
  if (!meta) {
    return (
      <Link
        href="/games"
        className={cn(
          "block w-[min(100%,18rem)] rounded-2xl border border-border/60 bg-background px-3.5 py-3 text-sm hover:bg-muted/50 transition-colors",
          isMine && "border-primary/25",
          className
        )}
      >
        <p className="font-medium">게임 보기</p>
        <p className="text-xs text-muted-foreground mt-0.5">mocomo.net</p>
      </Link>
    );
  }

  const subtitle =
    meta.mode === "direct"
      ? "1:1 게임 · 지금 바로 시작"
      : `${meta.minPlayers}~${meta.maxPlayers}인 · 로비 참여`;

  return (
    <Link
      href={meta.href}
      className={cn(
        "block w-[min(100%,18rem)] overflow-hidden rounded-2xl border border-border/70 bg-background text-left shadow-sm transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-cobalt/40",
        isMine && "border-primary/30",
        className
      )}
    >
      <div
        className="relative aspect-[16/9] flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${meta.bannerFrom} 0%, ${meta.bannerTo} 100%)`,
        }}
      >
        <span className="text-5xl leading-none select-none" aria-hidden>
          {meta.icon}
        </span>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">
          {meta.roomCode}
        </span>
      </div>

      <div className="border-t border-border/60 bg-background px-3 py-2.5 space-y-1">
        <p className="text-sm font-bold leading-snug text-foreground line-clamp-2">
          {meta.title} — {subtitle}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-folk-cobalt underline underline-offset-2 truncate">
            {meta.domain}
          </span>
          {meta.mode === "lobby" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
              <Users className="h-3 w-3" />
              로비
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

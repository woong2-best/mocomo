"use client";

import { useSession } from "next-auth/react";
import { useLiveChatMessages } from "@/hooks/use-live-chat-messages";
import { useLiveOverlayDisplayQueue } from "@/hooks/use-live-overlay-display-queue";
import { cn } from "@/lib/utils";

/** 방송 영상 위 채팅 메시지 오버레이 (표시 전용) */
export function LiveVideoChatOverlay({
  channelId,
  className,
}: {
  channelId: string;
  className?: string;
}) {
  const { data: session } = useSession();
  const { messages } = useLiveChatMessages(channelId, session?.user?.id, 80);
  const visible = useLiveOverlayDisplayQueue(messages);

  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-[10%] z-[18] flex flex-col items-start gap-1.5 px-3 sm:px-4 pointer-events-none max-w-lg",
        className
      )}
    >
      {visible.map((m, i) => {
        const isLatest = i === visible.length - 1;
        return (
          <div
            key={m.id}
            className={cn(
              "rounded-xl border-2 px-3 py-2 max-w-full shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
              isLatest
                ? "border-fuchsia-500/90 bg-black/70"
                : "border-white/35 bg-black/55"
            )}
          >
            <p
              className={cn(
                "font-bold text-white leading-snug break-words",
                isLatest ? "text-base sm:text-lg" : "text-sm sm:text-base"
              )}
            >
              <span className={cn("mr-2", isLatest ? "text-fuchsia-200" : "text-white/90")}>
                {m.username}
              </span>
              {m.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}

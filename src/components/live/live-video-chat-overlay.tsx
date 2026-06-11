"use client";

import { useLiveChat } from "@/components/live/live-chat-provider";
import { LiveOverlayCommentFeed } from "@/components/live/live-overlay-comment-feed";
import { useLiveOverlayDisplayQueue } from "@/hooks/use-live-overlay-display-queue";
import { cn } from "@/lib/utils";

/** 방송 영상 위 채팅 — VTuber(우측 투명) 또는 인스타(하단) 스타일 */
export function LiveVideoChatOverlay({
  className,
  variant = "vtuber",
}: {
  channelId?: string;
  className?: string;
  variant?: "default" | "vtuber";
}) {
  const { messages } = useLiveChat();
  const visible = useLiveOverlayDisplayQueue(messages);

  if (variant === "vtuber") {
    return (
      <div
        className={cn(
          "absolute right-2 sm:right-4 top-[6%] bottom-[34%] z-[18] w-[min(44%,17rem)] pointer-events-none",
          "flex flex-col justify-end min-h-0 overflow-hidden",
          className
        )}
      >
        <LiveOverlayCommentFeed messages={visible} variant="vtuber" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-[12%] z-[18] px-3 sm:px-4 pointer-events-none",
        "flex flex-col justify-end max-h-[42%] min-h-0 overflow-hidden",
        className
      )}
    >
      <LiveOverlayCommentFeed messages={visible} variant="default" />
    </div>
  );
}

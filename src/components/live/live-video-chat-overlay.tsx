"use client";

import { useLiveChat } from "@/components/live/live-chat-provider";
import { LiveOverlayCommentFeed } from "@/components/live/live-overlay-comment-feed";
import { useLiveOverlayDisplayQueue } from "@/hooks/use-live-overlay-display-queue";
import { cn } from "@/lib/utils";

/** 방송 영상 위 채팅 — 인스타 라이브 댓글 스타일 */
export function LiveVideoChatOverlay({
  className,
}: {
  channelId?: string;
  className?: string;
}) {
  const { messages } = useLiveChat();
  const visible = useLiveOverlayDisplayQueue(messages);

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-[12%] z-[18] px-3 sm:px-4 pointer-events-none",
        "flex flex-col justify-end max-h-[42%] min-h-0 overflow-hidden",
        className
      )}
    >
      <LiveOverlayCommentFeed messages={visible} />
    </div>
  );
}

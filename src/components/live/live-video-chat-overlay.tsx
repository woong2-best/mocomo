"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { subscribeLiveChat, useLiveSocket } from "@/hooks/use-live-socket";
import { ensureArray } from "@/lib/ensure-array";
import type { LiveChatMessage } from "@/components/live/live-chat";
import { cn } from "@/lib/utils";

const OVERLAY_MAX = 8;

/** 방송 영상 위 채팅 메시지 오버레이 (표시 전용) */
export function LiveVideoChatOverlay({
  channelId,
  className,
}: {
  channelId: string;
  className?: string;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { socket } = useLiveSocket(userId, channelId);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);

  const appendMessage = useCallback((m: LiveChatMessage) => {
    setMessages((prev) => {
      const safe = ensureArray<LiveChatMessage>(prev);
      if (safe.some((x) => x.id === m.id)) return safe;
      return [...safe, m].slice(-20);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/live/${channelId}/chat?initial=1`, { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.json();
        if (!res.ok || !body.ok) return;
        setMessages(ensureArray<LiveChatMessage>(body.messages).slice(-20));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => subscribeLiveChat(socket, appendMessage), [socket, appendMessage]);

  const visible = ensureArray<LiveChatMessage>(messages).slice(-OVERLAY_MAX);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-[12%] z-[18] flex flex-col items-start gap-1.5 px-3 sm:px-4 pointer-events-none max-w-lg",
        className
      )}
    >
      {visible.map((m, i) => {
        const isLatest = i === visible.length - 1;
        return (
          <div
            key={m.id}
            className={cn(
              "rounded-xl border-2 px-3 py-2 max-w-full shadow-lg backdrop-blur-sm",
              isLatest
                ? "border-fuchsia-500/90 bg-black/65"
                : "border-white/30 bg-black/50"
            )}
          >
            <p
              className={cn(
                "font-bold text-white leading-snug break-words",
                isLatest ? "text-base sm:text-lg" : "text-sm sm:text-base"
              )}
            >
              <span className={cn("mr-2", isLatest ? "text-fuchsia-200" : "text-white/85")}>
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

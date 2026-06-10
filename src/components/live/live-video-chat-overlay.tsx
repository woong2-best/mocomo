"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { subscribeLiveChat, useLiveSocket } from "@/hooks/use-live-socket";
import { ensureArray } from "@/lib/ensure-array";
import type { LiveChatMessage } from "@/components/live/live-chat";
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
  const userId = session?.user?.id;
  const { socket } = useLiveSocket(userId, channelId);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);

  const appendMessage = useCallback((m: LiveChatMessage) => {
    setMessages((prev) => {
      const safe = ensureArray<LiveChatMessage>(prev);
      if (safe.some((x) => x.id === m.id)) return safe;
      return [...safe, m].slice(-12);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/live/${channelId}/chat?initial=1`, { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.json();
        if (!res.ok || !body.ok) return;
        setMessages(ensureArray<LiveChatMessage>(body.messages).slice(-12));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => subscribeLiveChat(socket, appendMessage), [socket, appendMessage]);

  const visible = ensureArray<LiveChatMessage>(messages).slice(-5);
  if (visible.length === 0) return null;

  const latest = visible[visible.length - 1];

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-[18%] z-[18] flex flex-col items-start gap-2 px-4 pointer-events-none max-w-xl",
        className
      )}
    >
      {visible.slice(0, -1).map((m) => (
        <p
          key={m.id}
          className="text-sm text-white leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] line-clamp-2"
        >
          <span className="font-bold mr-1.5">{m.username}</span>
          {m.content}
        </p>
      ))}
      {latest && (
        <div className="rounded-xl border-[3px] border-fuchsia-500/90 bg-black/55 backdrop-blur-sm px-4 py-3 max-w-full shadow-lg">
          <p className="text-base sm:text-lg font-bold text-white leading-snug break-words">
            <span className="text-fuchsia-200 mr-2">{latest.username}</span>
            {latest.content}
          </p>
        </div>
      )}
    </div>
  );
}

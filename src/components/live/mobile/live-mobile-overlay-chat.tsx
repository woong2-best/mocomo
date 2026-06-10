"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  relayLiveChatMessage,
  subscribeLiveChat,
  useLiveSocket,
} from "@/hooks/use-live-socket";
import { ensureArray } from "@/lib/ensure-array";
import type { LiveChatMessage } from "@/components/live/live-chat";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";
import type { SupportTierLevel } from "@prisma/client";

/** 인스타 라이브 스타일 — 영상 위 채팅 오버레이 */
export function LiveMobileOverlayChat({
  channelId,
  onViewerCount,
  hostUserId,
  hostUsername,
  hostDisplayName,
  paymentsEnabled,
  viewerSupportTier,
  viewerSupportTotal,
  showMessages = true,
}: {
  channelId: string;
  onViewerCount?: (n: number) => void;
  hostUserId?: string;
  hostUsername?: string;
  hostDisplayName?: string;
  paymentsEnabled?: boolean;
  viewerSupportTier?: SupportTierLevel;
  viewerSupportTotal?: number;
  /** false면 영상 위 채팅 글자 숨김 (입력창은 유지) */
  showMessages?: boolean;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const username = session?.user?.username ?? session?.user?.name ?? "me";
  const { socket } = useLiveSocket(userId, channelId);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const lastSyncRef = useRef<string>(new Date(0).toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const appendMessage = useCallback((m: LiveChatMessage) => {
    setMessages((prev) => {
      const safe = ensureArray<LiveChatMessage>(prev);
      if (safe.some((x) => x.id === m.id)) return safe;
      return [...safe, m].slice(-80);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/live/${channelId}/chat?initial=1`, { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.json();
        if (!res.ok || !body.ok) return;
        const list = ensureArray<LiveChatMessage>(body.messages);
        setMessages(list);
        if (list.length > 0) {
          lastSyncRef.current = new Date(list[list.length - 1].at).toISOString();
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => {
    return subscribeLiveChat(socket, appendMessage, (count) => onViewerCount?.(count));
  }, [socket, appendMessage, onViewerCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content || !session?.user || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(`/api/live/${channelId}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok || !body.message) {
        setText(content);
        return;
      }
      const saved = body.message as LiveChatMessage;
      appendMessage(saved);
      lastSyncRef.current = new Date(saved.at).toISOString();
      relayLiveChatMessage(socket, channelId, saved);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col justify-end min-h-0 pointer-events-none">
      {showMessages && (
      <div
        ref={scrollRef}
        className="max-h-[38vh] overflow-y-auto overflow-x-hidden px-3 pb-2 space-y-2 mask-fade-top pointer-events-none"
      >
        {ensureArray<LiveChatMessage>(messages).map((m) => (
          <div key={m.id} className="flex items-start gap-2 pointer-events-auto max-w-[92%]">
            <Avatar className="h-7 w-7 shrink-0 border border-white/20">
              <AvatarImage src={m.image ?? undefined} />
              <AvatarFallback className="text-[9px] bg-black/40 text-white">
                {m.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-white leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              <span className="font-bold mr-1.5">{m.username}</span>
              {m.content}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      )}

      {session?.user ? (
        <div className="flex items-center gap-2 px-3 pb-safe pt-2 pointer-events-auto">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
            placeholder="댓글 달기…"
            className="flex-1 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/20 px-4 text-sm text-white placeholder:text-white/60"
            maxLength={200}
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !text.trim()}
            className="h-10 w-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-40"
            aria-label="댓글 보내기"
          >
            <Send className="h-4 w-4" />
          </button>
          {!hostUserId || !hostUsername ? null : paymentsEnabled ? (
            <TipCreatorDialog
              creatorId={hostUserId}
              username={hostUsername}
              displayName={hostDisplayName ?? hostUsername}
              currentTier={viewerSupportTier}
              currentTotal={viewerSupportTotal}
              paymentsEnabled
              channelId={channelId}
              returnPath={`/voice/${channelId}`}
              triggerVariant="ghost"
              triggerSize="icon"
              iconOnly
              triggerClassName="h-10 w-10 rounded-full bg-white/15 backdrop-blur-md text-white hover:bg-white/25 hover:text-white"
              triggerIcon={<Heart className="h-5 w-5" />}
            />
          ) : (
            <span className="h-10 w-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white/80">
              <Heart className="h-5 w-5" />
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

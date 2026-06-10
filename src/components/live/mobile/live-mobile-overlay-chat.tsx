"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart, Send } from "lucide-react";
import { LiveOverlayCommentFeed } from "@/components/live/live-overlay-comment-feed";
import { useLiveChatMessages } from "@/hooks/use-live-chat-messages";
import { useLiveOverlayDisplayQueue } from "@/hooks/use-live-overlay-display-queue";
import { relayLiveChatMessage } from "@/hooks/use-live-socket";
import type { LiveChatMessage } from "@/components/live/live-chat";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";
import type { SupportTierLevel } from "@prisma/client";

/** 인스타 라이브 스타일 — 영상 위 채팅 오버레이 + 입력 */
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
  const { messages, socket, appendMessage } = useLiveChatMessages(
    channelId,
    userId,
    80,
    onViewerCount
  );
  const visible = useLiveOverlayDisplayQueue(messages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMessages) return;
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visible, showMessages]);

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
      relayLiveChatMessage(socket, channelId, saved);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col justify-end min-h-0 pointer-events-none w-full">
      {showMessages && visible.length > 0 && (
        <div className="px-3 pb-2 max-h-[34vh] overflow-hidden pointer-events-none mask-fade-top">
          <LiveOverlayCommentFeed messages={visible} avatarSize="sm" />
          <div ref={feedEndRef} className="h-px w-full shrink-0" aria-hidden />
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

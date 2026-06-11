"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Send, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SupportTierLevel } from "@prisma/client";
import { deleteLiveChatMessage } from "@/actions/live-stream";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { ReportButton } from "@/components/report/report-button";
import { relayLiveChatMessage } from "@/hooks/use-live-socket";
import { useLiveChat } from "@/components/live/live-chat-provider";
import { ensureArray } from "@/lib/ensure-array";
import { LiveDonationToolbar } from "@/components/live/live-donation-toolbar";
import { LiveSupportSidebar } from "@/components/live/live-support-sidebar";

export type LiveChatMessage = {
  id: string;
  userId: string;
  username: string;
  content: string;
  at: number;
  image?: string | null;
  supportTierSent?: SupportTierLevel;
};

export const LiveChat = memo(LiveChatInner);

function LiveChatInner({
  channelId,
  viewerCount,
  isHost,
  canModerate,
  hostUserId,
  hostUsername,
  hostDisplayName,
  viewerSupportTier,
  viewerSupportTotal,
  paymentsEnabled,
}: {
  channelId: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  isHost?: boolean;
  canModerate?: boolean;
  hostUserId?: string;
  hostUsername?: string;
  hostDisplayName?: string;
  viewerSupportTier?: SupportTierLevel;
  viewerSupportTotal?: number;
  paymentsEnabled?: boolean;
}) {
  const { data: session } = useSession();
  const username = session?.user?.username ?? session?.user?.name ?? "me";
  const {
    messages,
    appendMessage,
    replaceOptimistic,
    removeMessage: removeFromFeed,
    socket,
    connected,
    historyError,
  } = useLiveChat();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const pendingIdRef = useRef(0);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function send() {
    const content = text.trim();
    if (!content || !session?.user || sending) return;

    const tempId = `pending-${++pendingIdRef.current}`;
    const optimistic: LiveChatMessage = {
      id: tempId,
      userId: session.user.id,
      username: typeof username === "string" ? username.replace(/^@/, "") : "me",
      content,
      at: Date.now(),
      image: session.user.image ?? null,
    };

    setSending(true);
    setError("");
    setText("");
    stickToBottomRef.current = true;
    appendMessage(optimistic);

    try {
      const res = await fetch(`/api/live/${channelId}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok || !body.message) {
        removeFromFeed(tempId);
        setError(body.error ?? "전송에 실패했습니다.");
        setText(content);
        return;
      }
      const saved = body.message as LiveChatMessage;
      replaceOptimistic(tempId, saved);
      relayLiveChatMessage(socket, channelId, saved);
    } catch {
      removeFromFeed(tempId);
      setError("네트워크 오류로 전송하지 못했습니다.");
      setText(content);
    } finally {
      setSending(false);
    }
  }

  async function removeMessage(messageId: string) {
    const res = await deleteLiveChatMessage(channelId, messageId);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    removeFromFeed(messageId);
  }

  return (
    <div className="flex flex-col h-full min-h-[min(70vh,560px)] rounded-xl border border-border/60 bg-background overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/60 flex justify-between items-center bg-muted/30 shrink-0">
        <span className="font-semibold text-sm">
          채팅
          {isHost && <span className="text-[10px] text-muted-foreground ml-1">호스트</span>}
          {connected && <span className="text-[10px] text-green-600 ml-1">실시간</span>}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
          <Users className="h-3.5 w-3.5" />
          {viewerCount}
        </span>
      </div>
      <LiveSupportSidebar
        channelId={channelId}
        isHost={!!isHost}
        hostDisplayName={hostDisplayName ?? hostUsername ?? "스트리머"}
        hostUserId={hostUserId}
        hostUsername={hostUsername}
        paymentsEnabled={paymentsEnabled}
      />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0"
      >
        {historyError && (
          <p className="text-xs text-destructive text-center py-2 px-2">{historyError}</p>
        )}
        {messages.length === 0 && !historyError && (
          <p className="text-xs text-muted-foreground text-center py-8">
            채팅은 DB에 저장됩니다. 첫 메시지를 남겨 보세요.
          </p>
        )}
        {ensureArray<LiveChatMessage>(messages).map((m) => (
          <div key={m.id} className="flex gap-2 text-sm group">
            <UserProfileLink username={m.username} className="shrink-0 rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarImage src={m.image ?? undefined} />
                <AvatarFallback className="text-[10px]">{m.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </UserProfileLink>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <DisplayNameWithSupportTier
                  name={<span className="font-semibold text-xs text-primary">@{m.username}</span>}
                  profileUsername={m.username}
                  tier={m.supportTierSent ?? "PEBBLE"}
                  compact
                  className="flex-wrap"
                />
                {canModerate && !m.id.startsWith("pending-") && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5"
                    onClick={() => void removeMessage(m.id)}
                    aria-label="채팅 삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                {session?.user && m.userId !== session.user.id && !m.id.startsWith("pending-") && (
                  <ReportButton
                    targetType="LIVE_CHAT"
                    targetId={m.id}
                    reportedUserId={m.userId}
                    label="신고"
                    variant="ghost"
                    size="sm"
                  />
                )}
              </div>
              <p className="text-sm break-words leading-snug mt-0.5">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {session?.user ? (
        <div className="p-2.5 border-t border-border/60 shrink-0 space-y-1">
          <LiveDonationToolbar
            channelId={channelId}
            hostDisplayName={hostDisplayName ?? hostUsername ?? "스트리머"}
            hostUserId={hostUserId}
            hostUsername={hostUsername}
            paymentsEnabled={paymentsEnabled}
            isHost={isHost}
          />
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
              placeholder="채팅 입력…"
              className="rounded-lg text-sm h-9"
              maxLength={200}
              disabled={sending}
            />
            <Button
              size="sm"
              className="rounded-lg shrink-0 h-9 px-3"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="p-3 text-xs text-center text-muted-foreground shrink-0">채팅하려면 로그인하세요</p>
      )}
    </div>
  );
}

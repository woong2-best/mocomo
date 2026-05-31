"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
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
import {
  relayLiveChatMessage,
  subscribeLiveChat,
  useLiveSocket,
} from "@/hooks/use-live-socket";
import { ensureArray } from "@/lib/ensure-array";
import { TipCreatorDialog } from "@/components/support/tip-creator-dialog";

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
  onViewerCount,
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
  const userId = session?.user?.id;
  const username = session?.user?.username ?? session?.user?.name ?? "me";
  const { socket, connected } = useLiveSocket(userId, channelId);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const lastSyncRef = useRef<string>(new Date(0).toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const pendingIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setHistoryError("");
    fetch(`/api/live/${channelId}/chat?initial=1`, { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.json();
        if (!res.ok || !body.ok) {
          setHistoryError("채팅 기록을 불러오지 못했습니다. DB 마이그레이션을 확인해 주세요.");
          return;
        }
        const list = ensureArray<LiveChatMessage>(body.messages);
        setMessages(list);
        if (list.length > 0) {
          lastSyncRef.current = new Date(list[list.length - 1].at).toISOString();
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryError("채팅 기록을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const onViewerCountRef = useRef(onViewerCount);
  onViewerCountRef.current = onViewerCount;
  const viewerCountRef = useRef(viewerCount);
  viewerCountRef.current = viewerCount;

  const appendMessage = useCallback((m: LiveChatMessage) => {
    setMessages((prev) => {
      const safePrev = ensureArray<LiveChatMessage>(prev);
      if (safePrev.some((x) => x.id === m.id)) return safePrev;
      return [...safePrev, m].slice(-150);
    });
  }, []);

  useEffect(() => {
    return subscribeLiveChat(
      socket,
      (m) => {
        appendMessage(m);
        lastSyncRef.current = new Date(m.at).toISOString();
        stickToBottomRef.current = true;
      },
      (count) => {
        if (count !== viewerCountRef.current) {
          viewerCountRef.current = count;
          onViewerCountRef.current?.(count);
        }
      }
    );
  }, [socket, appendMessage]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live/${channelId}/chat?since=${encodeURIComponent(lastSyncRef.current)}`,
        { credentials: "include", cache: "no-store" }
      );
      const body = await res.json();
      if (!res.ok || !body.ok) return;
      if (typeof body.viewerCount === "number" && body.viewerCount !== viewerCountRef.current) {
        viewerCountRef.current = body.viewerCount;
        onViewerCountRef.current?.(body.viewerCount);
      }
      const incoming = ensureArray<LiveChatMessage>(body.messages);
      if (incoming.length > 0) {
        setMessages((prev) => {
          const safePrev = ensureArray<LiveChatMessage>(prev);
          const ids = new Set(safePrev.map((m) => m.id));
          const added = incoming.filter((m) => !ids.has(m.id));
          return [...safePrev, ...added].slice(-150);
        });
        const last = incoming[incoming.length - 1];
        lastSyncRef.current = new Date(last.at).toISOString();
      }
    } catch {
      /* ignore */
    }
  }, [channelId]);

  useEffect(() => {
    poll();
    const ms = connected ? 12000 : 4000;
    const id = setInterval(poll, ms);
    return () => clearInterval(id);
  }, [poll, connected]);

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
        setMessages((prev) => ensureArray<LiveChatMessage>(prev).filter((m) => m.id !== tempId));
        setError(body.error ?? "전송에 실패했습니다.");
        setText(content);
        return;
      }
      const saved = body.message as LiveChatMessage;
      setMessages((prev) => {
        const without = ensureArray<LiveChatMessage>(prev).filter((m) => m.id !== tempId);
        if (without.some((m) => m.id === saved.id)) return without;
        return [...without, saved].slice(-150);
      });
      lastSyncRef.current = new Date(saved.at).toISOString();
      relayLiveChatMessage(socket, channelId, saved);
    } catch {
      setMessages((prev) => ensureArray<LiveChatMessage>(prev).filter((m) => m.id !== tempId));
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
    setMessages((prev) => ensureArray<LiveChatMessage>(prev).filter((m) => m.id !== messageId));
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
                    onClick={() => removeMessage(m.id)}
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
          {!isHost && hostUserId && hostUsername && (
            <div className="flex justify-end pb-1">
              <TipCreatorDialog
                creatorId={hostUserId}
                username={hostUsername}
                displayName={hostDisplayName ?? hostUsername}
                currentTier={viewerSupportTier}
                currentTotal={viewerSupportTotal}
                paymentsEnabled={!!paymentsEnabled}
                channelId={channelId}
                returnPath={`/voice/${channelId}`}
                triggerVariant="outline"
                triggerSize="sm"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="채팅 입력…"
              className="rounded-lg text-sm h-9"
              maxLength={200}
              disabled={sending}
            />
            <Button
              size="sm"
              className="rounded-lg shrink-0 h-9 px-3"
              onClick={send}
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

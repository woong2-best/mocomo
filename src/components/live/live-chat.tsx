"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Send, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SupportTierLevel } from "@prisma/client";
import {
  sendLiveChatMessage,
  getLiveStreamSync,
  loadLiveChatHistory,
  deleteLiveChatMessage,
} from "@/actions/live-stream";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { ReportButton } from "@/components/report/report-button";
import {
  relayLiveChatMessage,
  subscribeLiveChat,
  useLiveSocket,
} from "@/hooks/use-live-socket";
import type { LiveTipAlert } from "@/components/live/live-tip-alerts";

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
  onRecentTips,
}: {
  channelId: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  isHost?: boolean;
  canModerate?: boolean;
  onRecentTips?: (tips: LiveTipAlert[]) => void;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { socket, connected } = useLiveSocket(userId, channelId);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const lastSyncRef = useRef<string>(new Date(0).toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    loadLiveChatHistory(channelId).then((res) => {
      if (cancelled || "error" in res) return;
      setMessages(res.messages);
      if (res.messages.length > 0) {
        lastSyncRef.current = new Date(res.messages[res.messages.length - 1].at).toISOString();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const onViewerCountRef = useRef(onViewerCount);
  onViewerCountRef.current = onViewerCount;
  const viewerCountRef = useRef(viewerCount);
  viewerCountRef.current = viewerCount;
  const onRecentTipsRef = useRef(onRecentTips);
  onRecentTipsRef.current = onRecentTips;

  const appendMessage = useCallback((m: LiveChatMessage) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev;
      return [...prev, m].slice(-120);
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
    const res = await getLiveStreamSync(channelId, lastSyncRef.current);
    if ("error" in res) return;
    if (res.viewerCount !== viewerCountRef.current) {
      viewerCountRef.current = res.viewerCount;
      onViewerCountRef.current?.(res.viewerCount);
    }
    if (res.recentTips?.length) {
      onRecentTipsRef.current?.(res.recentTips);
    }
    if (res.messages.length > 0) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const added = res.messages.filter((m) => !ids.has(m.id));
        return [...prev, ...added].slice(-120);
      });
      const last = res.messages[res.messages.length - 1];
      lastSyncRef.current = new Date(last.at).toISOString();
    }
  }, [channelId]);

  useEffect(() => {
    poll();
    const ms = connected ? 5000 : 2500;
    const id = setInterval(poll, ms);
    return () => clearInterval(id);
  }, [poll, connected]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
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
    setSending(true);
    setError("");
    const res = await sendLiveChatMessage(channelId, content);
    setSending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("message" in res && res.message) {
      stickToBottomRef.current = true;
      appendMessage(res.message);
      lastSyncRef.current = new Date(res.message.at).toISOString();
      relayLiveChatMessage(socket, channelId, res.message);
    }
    setText("");
  }

  async function removeMessage(messageId: string) {
    const res = await deleteLiveChatMessage(channelId, messageId);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-2xl border border-border/60 bg-background/95 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex justify-between items-center bg-muted/30">
        <span className="font-semibold text-sm">
          라이브 채팅 {connected && <span className="text-[10px] text-green-600 ml-1">실시간</span>}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {viewerCount}명 시청
        </span>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 max-h-[min(50vh,420px)]"
      >
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-10">
            채팅이 실시간으로 저장됩니다. 첫 인사를 남겨 보세요!
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2 text-sm animate-in fade-in duration-200 group">
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
                {canModerate && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5"
                    onClick={() => removeMessage(m.id)}
                    aria-label="채팅 삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                {session?.user && m.userId !== session.user.id && (
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
        <div className="p-3 border-t border-border/60 bg-background space-y-1">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="메시지 입력…"
              className="rounded-xl text-sm h-10"
              maxLength={200}
              disabled={sending}
            />
            <Button
              size="sm"
              className="rounded-xl shrink-0 h-10 px-4"
              onClick={send}
              disabled={sending || !text.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {isHost && (
            <p className="text-[10px] text-muted-foreground">호스트 · 운영진은 채팅에 마우스를 올리면 삭제할 수 있습니다.</p>
          )}
        </div>
      ) : (
        <p className="p-4 text-xs text-center text-muted-foreground">채팅하려면 로그인하세요</p>
      )}
    </div>
  );
}

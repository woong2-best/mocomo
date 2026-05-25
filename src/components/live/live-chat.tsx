"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sendLiveChatMessage, getLiveStreamSync, loadLiveChatHistory } from "@/actions/live-stream";

export type LiveChatMessage = {
  id: string;
  userId: string;
  username: string;
  content: string;
  at: number;
  image?: string | null;
};

export const LiveChat = memo(LiveChatInner);

function LiveChatInner({
  channelId,
  viewerCount,
  onViewerCount,
}: {
  channelId: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const lastSyncRef = useRef<string>(new Date(0).toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const poll = useCallback(async () => {
    const res = await getLiveStreamSync(channelId, lastSyncRef.current);
    if ("error" in res) return;
    const prev = viewerCount;
    if (res.viewerCount !== prev) onViewerCountRef.current?.(res.viewerCount);
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
    const id = setInterval(poll, 2500);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      setMessages((prev) => [...prev, res.message].slice(-120));
      lastSyncRef.current = new Date(res.message.at).toISOString();
    }
    setText("");
  }

  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-2xl border border-border/60 bg-background/95 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex justify-between items-center bg-muted/30">
        <span className="font-semibold text-sm">라이브 채팅</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {viewerCount}명 시청
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 max-h-[min(50vh,420px)]">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-10">
            채팅이 실시간으로 저장됩니다. 첫 인사를 남겨 보세요!
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2 text-sm animate-in fade-in duration-200">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={m.image ?? undefined} />
              <AvatarFallback className="text-[10px]">{m.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-xs text-primary">@{m.username}</span>
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
        </div>
      ) : (
        <p className="p-4 text-xs text-center text-muted-foreground">채팅하려면 로그인하세요</p>
      )}
    </div>
  );
}
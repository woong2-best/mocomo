"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { sendMessage } from "@/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatComposer } from "@/components/chat/chat-composer";
import {
  formatBubbleTime,
  formatDateDivider,
  shouldShowAvatar,
  shouldShowDateDivider,
} from "@/lib/chat-display";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  content: string | null;
  createdAt: string;
  sender: { id: string; username: string; image: string | null };
};

export function ChatRoomClient({
  roomId,
  userId,
  username,
  initialMessages = [],
}: {
  roomId: string;
  userId: string;
  username: string;
  initialMessages?: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [realtimeOff, setRealtimeOff] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length <= initialMessages.length ? "auto" : "smooth");
  }, [messages, scrollToBottom, initialMessages.length]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!url || url.includes("localhost")) {
      setRealtimeOff(true);
      return;
    }

    const socket = io(url, { auth: { userId }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join_room", roomId);
    socket.on("new_message", (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => {
      socket.emit("leave_room", roomId);
      socket.disconnect();
    };
  }, [roomId, userId]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    stickToBottomRef.current = true;

    try {
      const result = await sendMessage({ roomId, content: text });
      const msg = result.message;
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
          sender: {
            id: msg.sender.id,
            username: msg.sender.username ?? username,
            image: msg.sender.image,
          },
        },
      ]);
      setInput("");
    } catch {
      setError("메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-muted/20">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 py-4 space-y-1"
      >
        {realtimeOff && (
          <p className="text-[11px] text-center text-muted-foreground bg-muted/60 border border-border/50 rounded-lg px-3 py-2 mb-3">
            실시간 연결이 꺼져 있습니다. 새 메시지는 전송 후 반영되며, 상대 메시지는 새로고침하면 보입니다.
          </p>
        )}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">아직 메시지가 없어요</p>
            <p className="text-xs text-muted-foreground mt-1">인사를 건네 보세요 👋</p>
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const isMine = m.sender.id === userId;
          const showDate = shouldShowDateDivider(prev?.createdAt ?? null, m.createdAt);
          const showAvatar = shouldShowAvatar(
            prev ? { senderId: prev.sender.id } : null,
            { senderId: m.sender.id },
            isMine
          );
          const showTime =
            !messages[i + 1] ||
            messages[i + 1].sender.id !== m.sender.id ||
            shouldShowDateDivider(m.createdAt, messages[i + 1].createdAt);

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="text-[11px] font-medium text-muted-foreground bg-background/80 border border-border/50 px-3 py-1 rounded-full">
                    {formatDateDivider(m.createdAt)}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "flex gap-2 mb-0.5",
                  isMine ? "justify-end" : "justify-start",
                  showAvatar ? "mt-3" : "mt-0.5"
                )}
              >
                {!isMine && (
                  <div className="w-8 shrink-0 flex justify-center">
                    {showAvatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.sender.image ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {m.sender.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="w-8" />
                    )}
                  </div>
                )}
                <div className={cn("flex flex-col max-w-[78%] sm:max-w-[70%]", isMine && "items-end")}>
                  {!isMine && showAvatar && (
                    <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
                      {m.sender.username}
                    </span>
                  )}
                  <div
                    className={cn(
                      "px-3.5 py-2 text-[15px] leading-snug break-words shadow-sm",
                      isMine
                        ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-2xl rounded-bl-md bg-background border border-border/60"
                    )}
                  >
                    {m.content}
                  </div>
                  {showTime && (
                    <span
                      className={cn(
                        "text-[10px] text-muted-foreground mt-1 tabular-nums",
                        isMine ? "mr-1" : "ml-1"
                      )}
                    >
                      {formatBubbleTime(m.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive px-4 pb-1 text-center">{error}</p>}
      <ChatComposer value={input} onChange={setInput} onSend={send} disabled={sending} />
    </div>
  );
}

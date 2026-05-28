"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { SupportTierLevel } from "@prisma/client";
import { sendMessage } from "@/actions/chat";
import { useChatSocket } from "@/components/messages/chat-socket-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatComposer } from "@/components/chat/chat-composer";
import { PresenceAvatar } from "@/components/user/presence-avatar";
import {
  formatBubbleTime,
  formatDateDivider,
  shouldShowAvatar,
  shouldShowDateDivider,
} from "@/lib/chat-display";
import {
  normalizeChatMessage,
  isPendingMessageId,
  type ChatMessageView,
} from "@/lib/chat-message-normalize";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { cn } from "@/lib/utils";

type Message = ChatMessageView;

export function ChatRoomClient({
  roomId,
  userId,
  username,
  userImage = null,
  userSupportTier = "PEBBLE",
  initialMessages = [],
}: {
  roomId: string;
  userId: string;
  username: string;
  userImage?: string | null;
  userSupportTier?: SupportTierLevel;
  initialMessages?: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const { socket, socketReady, realtimeOff, isUserOnline, subscribeMessages } = useChatSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const sendLockRef = useRef(false);

  const selfSender = useRef({
    id: userId,
    username,
    image: userImage,
    supportTierSent: userSupportTier,
  });
  selfSender.current = {
    id: userId,
    username,
    image: userImage,
    supportTierSent: userSupportTier,
  };

  const mergeIncoming = useCallback((raw: unknown) => {
    const incoming = normalizeChatMessage(raw, selfSender.current);
    if (!incoming) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      const withoutStalePending = prev.filter(
        (m) =>
          !(
            isPendingMessageId(m.id) &&
            m.sender.id === incoming.sender.id &&
            m.content === incoming.content
          )
      );
      return [...withoutStalePending, incoming];
    });
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length <= initialMessages.length ? "auto" : "smooth");
  }, [messages, scrollToBottom, initialMessages.length]);

  useEffect(() => subscribeMessages(mergeIncoming), [subscribeMessages, mergeIncoming]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }

  function addOptimistic(text: string): string {
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: pendingId,
      content: text,
      createdAt: new Date().toISOString(),
      sender: { ...selfSender.current },
    };
    setMessages((prev) => [...prev, optimistic]);
    return pendingId;
  }

  function removePending(pendingId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== pendingId));
  }

  async function sendViaAction(text: string, pendingId: string) {
    try {
      const result = await sendMessage({ roomId, content: text });
      const confirmed = normalizeChatMessage(
        {
          ...result.message,
          createdAt: result.message.createdAt,
        },
        selfSender.current
      );
      if (!confirmed) return;
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== pendingId && m.id !== confirmed.id);
        return [...without, confirmed];
      });
    } catch {
      removePending(pendingId);
      setError("메시지 전송에 실패했습니다.");
    }
  }

  function send() {
    const text = input.trim();
    if (!text || sendLockRef.current) return;

    sendLockRef.current = true;
    setError("");
    stickToBottomRef.current = true;
    setInput("");

    const pendingId = addOptimistic(text);

    if (socketReady && socket?.connected) {
      socket.emit("send_message", { roomId, content: text });
      queueMicrotask(() => {
        sendLockRef.current = false;
      });
      return;
    }

    void sendViaAction(text, pendingId).finally(() => {
      sendLockRef.current = false;
    });
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
            실시간 연결이 꺼져 있습니다. 메시지는 전송되며, 상대 메시지는 새로고침하면 보입니다.
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
          const pending = isPendingMessageId(m.id);
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
                  showAvatar ? "mt-3" : "mt-0.5",
                  pending && isMine && "opacity-80"
                )}
              >
                {!isMine && (
                  <div className="w-8 shrink-0 flex justify-center">
                    {showAvatar ? (
                      <UserProfileLink username={m.sender.username} className="rounded-full">
                        <PresenceAvatar
                          online={!isMine && isUserOnline(m.sender.id)}
                          size="sm"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.sender.image ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {m.sender.username[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </PresenceAvatar>
                      </UserProfileLink>
                    ) : (
                      <span className="w-8" />
                    )}
                  </div>
                )}
                <div className={cn("flex flex-col max-w-[78%] sm:max-w-[70%]", isMine && "items-end")}>
                  {!isMine && showAvatar && (
                    <DisplayNameWithSupportTier
                      name={m.sender.username}
                      profileUsername={m.sender.username}
                      tier={m.sender.supportTierSent ?? "PEBBLE"}
                      nameClassName="text-[11px] font-medium text-muted-foreground"
                      compact
                      className="mb-1 ml-1"
                    />
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
      <ChatComposer value={input} onChange={setInput} onSend={send} />
    </div>
  );
}

"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ChatMessageContextMenu } from "@/components/chat/chat-message-context-menu";
import type { SupportTierLevel } from "@prisma/client";
import { sendMessage } from "@/actions/chat";
import { deleteCommunityChatMessage } from "@/actions/community-content";
import { useChatSocket } from "@/components/messages/chat-socket-context";
import { ChatMediaComposer } from "@/components/chat/chat-media-composer";
import { ChatMessageAttachments } from "@/components/chat/chat-message-attachments";
import { ChatMessageReplyQuote } from "@/components/chat/chat-message-reply-quote";
import { ChatReplyComposerBar } from "@/components/chat/chat-reply-composer-bar";
import { ChatSharedPostCard } from "@/components/chat/chat-shared-post-card";
import { ChatUsedListingCard } from "@/components/chat/chat-used-listing-card";
import { ChatUsedTradeRequestCard } from "@/components/chat/chat-used-trade-request-card";
import { ChatUsedTradePanel } from "@/components/chat/chat-used-trade-panel";
import {
  parseUsedTradeRequestMarker,
  stripUsedTradeRequestMarker,
} from "@/lib/chat-used-trade-request-marker";
import {
  formatBubbleTime,
  formatDateDivider,
  shouldShowDateDivider,
} from "@/lib/chat-display";
import type { ChatAttachmentInput } from "@/lib/chat-attachments";
import {
  normalizeChatMessage,
  isPendingMessageId,
  type ChatMessageView,
} from "@/lib/chat-message-normalize";
import { parseChatPostShare } from "@/lib/chat-post-share";
import {
  isUsedListingAttachment,
  parseChatUsedListing,
} from "@/lib/chat-used-listing-share";
import { stripLegacyGameShareMarker } from "@/lib/chat-legacy-game-share";
import { parseAtmLetter } from "@/lib/chat-atm-letter";
import { parseLetterDonationMarker } from "@/lib/chat-letter-donation";
import { TransferLetterCard } from "@/components/messages/transfer-letter-stage";
import { LetterDonationCard } from "@/components/donations/letter-donation-card";
import { cn } from "@/lib/utils";
import { filterDmMessageContent } from "@/lib/chat-content-filter";
import { useLocale } from "@/components/providers/locale-provider";

import { MESSAGE_REQUEST_BLOCKED } from "@/lib/contact-audience-copy";

type Message = ChatMessageView;

export function ChatRoomClient({
  roomId,
  userId,
  username,
  userImage = null,
  userSupportTier = "SEED",
  initialMessages = [],
  readOnly = false,
  readOnlyHint,
  communityId,
  vipEmoji = false,
  canDeleteMessages = false,
  skipInitialSync = false,
}: {
  roomId: string;
  userId: string;
  username: string;
  userImage?: string | null;
  userSupportTier?: SupportTierLevel;
  initialMessages?: Message[];
  readOnly?: boolean;
  readOnlyHint?: string;
  communityId?: string;
  vipEmoji?: boolean;
  canDeleteMessages?: boolean;
  /** SSR 메시지가 있으면 소켓 연결 전 전체 sync 생략 */
  skipInitialSync?: boolean;
}) {
  const { locale } = useLocale();
  const filterWarningCopy = t("chat.dmContentFilterWarning");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [error, setError] = useState("");
  const [filterWarning, setFilterWarning] = useState("");
  const { socket, socketReady, realtimeOff, subscribeMessages } = useChatSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoSendRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const sendLockRef = useRef(false);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const touchSwipeRef = useRef<{ x: number; id: string } | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const lastSyncedAtRef = useRef<string | null>(
    initialMessages.length
      ? initialMessages[initialMessages.length - 1]?.createdAt ?? null
      : null
  );

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
    if (
      !lastSyncedAtRef.current ||
      incoming.createdAt > lastSyncedAtRef.current
    ) {
      lastSyncedAtRef.current = incoming.createdAt;
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      const withoutStalePending = prev.filter((m) => {
        if (!isPendingMessageId(m.id)) return true;
        if (m.sender.id !== incoming.sender.id) return true;
        if (m.content && incoming.content && m.content === incoming.content) return false;
        const pendingAtt = m.attachments?.[0]?.url;
        const incomingAtt = incoming.attachments?.[0]?.url;
        if (pendingAtt && incomingAtt && pendingAtt === incomingAtt) return false;
        return true;
      });
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

  useEffect(() => {
    let cancelled = false;
    let waitAbort: AbortController | null = null;

    function applyBatch(list: unknown[]) {
      for (const raw of list) {
        const normalized = normalizeChatMessage(raw, selfSender.current);
        if (!normalized || isPendingMessageId(normalized.id)) continue;
        mergeIncoming(raw);
      }
    }

    async function quickSync() {
      if (skipInitialSync && initialMessages.length > 0) {
        const after = lastSyncedAtRef.current;
        if (!after) return;
        const res = await fetch(`/api/messages/${roomId}/sync?after=${encodeURIComponent(after)}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: unknown[] };
        applyBatch(Array.isArray(data.messages) ? data.messages : []);
        return;
      }
      const after = lastSyncedAtRef.current;
      const qs = after ? `?after=${encodeURIComponent(after)}` : "";
      const res = await fetch(`/api/messages/${roomId}/sync${qs}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: unknown[] };
      applyBatch(Array.isArray(data.messages) ? data.messages : []);
    }

    async function longPollLoop() {
      while (!cancelled) {
        if (document.visibilityState === "hidden") {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        if (socketReady && !realtimeOff) {
          await new Promise((r) => setTimeout(r, 8000));
          continue;
        }
        const after = lastSyncedAtRef.current;
        const qs = after ? `?after=${encodeURIComponent(after)}` : "";
        waitAbort?.abort();
        waitAbort = new AbortController();
        try {
          const res = await fetch(`/api/messages/${roomId}/wait${qs}`, {
            credentials: "include",
            signal: waitAbort.signal,
          });
          if (cancelled) return;
          if (!res.ok) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          const data = (await res.json()) as { messages?: unknown[] };
          applyBatch(Array.isArray(data.messages) ? data.messages : []);
        } catch (e) {
          if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    void quickSync().then(() => void longPollLoop());
    const onVisible = () => {
      if (document.visibilityState === "visible") void quickSync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      waitAbort?.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [roomId, realtimeOff, socketReady, mergeIncoming, skipInitialSync, initialMessages.length]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }

  function startReply(message: Message) {
    if (isPendingMessageId(message.id)) return;
    setReplyTarget(message);
    queueMicrotask(() => composerInputRef.current?.focus());
  }

  const jumpToQuotedMessage = useCallback((messageId: string) => {
    const el = messageRefs.current.get(messageId);
    if (!el) return;
    stickToBottomRef.current = false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightMessageId(messageId);
    window.setTimeout(() => setHighlightMessageId(null), 1500);
  }, []);

  function openMessageContextMenu(e: React.MouseEvent, message: Message) {
    if (isPendingMessageId(message.id) || readOnly) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  }

  function bindBubbleTouchSwipe(message: Message) {
    return {
      onTouchStart: (e: React.TouchEvent) => {
        touchSwipeRef.current = {
          x: e.touches[0]?.clientX ?? 0,
          id: message.id,
        };
      },
      onTouchEnd: (e: React.TouchEvent) => {
        const start = touchSwipeRef.current;
        touchSwipeRef.current = null;
        if (!start || start.id !== message.id) return;
        const endX = e.changedTouches[0]?.clientX ?? start.x;
        if (endX - start.x < -48) startReply(message);
      },
    };
  }

  function bubbleHighlightClass(messageId: string) {
    return highlightMessageId === messageId ? "chat-message-shake-highlight" : "";
  }

  function clearReply() {
    setReplyTarget(null);
  }

  const refreshPurchasedMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${roomId}/sync`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: unknown[] };
      for (const raw of Array.isArray(data.messages) ? data.messages : []) {
        const normalized = normalizeChatMessage(raw, selfSender.current);
        if (!normalized || isPendingMessageId(normalized.id)) continue;
        mergeIncoming(raw);
      }
    } catch {
      /* ignore */
    }
  }, [roomId, mergeIncoming]);

  function replySnapshot(message: Message): Message["replyTo"] {
    return {
      id: message.id,
      content: message.content,
      sender: message.sender,
      attachments: message.attachments,
    };
  }

  function addOptimistic(
    text: string | null,
    attachments?: ChatAttachmentInput[],
    replyTo?: Message["replyTo"]
  ): string {
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: pendingId,
      content: text,
      createdAt: new Date().toISOString(),
      sender: { ...selfSender.current },
      attachments: attachments?.map((a, i) => ({
        id: `pending-att-${i}`,
        url: a.url,
        type: a.type,
        name: a.name ?? null,
      })),
      replyTo,
    };
    setMessages((prev) => [...prev, optimistic]);
    return pendingId;
  }

  function removePending(pendingId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== pendingId));
  }

  async function sendViaAction(
    text: string | null,
    pendingId: string,
    attachments?: ChatAttachmentInput[],
    replyToId?: string
  ) {
    try {
      const result = await sendMessage({
        roomId,
        content: text ?? undefined,
        attachments,
        replyToId,
      });
      const confirmed = normalizeChatMessage(
        {
          ...result.message,
          createdAt: result.message.createdAt,
        },
        selfSender.current
      );
      if (!confirmed) return;
      if (result.contentFiltered) {
        setFilterWarning(filterWarningCopy);
      }
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== pendingId && m.id !== confirmed.id);
        return [...without, confirmed];
      });
      clearReply();
    } catch (e) {
      removePending(pendingId);
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.startsWith("SLOW_MODE:")
          ? t("chat.slowModeWait", { seconds: msg.split(":")[1] ?? "0" })
          : msg === "CHANNEL_LOCKED"
            ? t("ui.this_channel_is_locked")
            : msg === "ATTACHMENT_INVALID"
              ? t("ui.couldn_t_save_attachment_please_try")
              : msg === "PAID_DM_DISABLED"
                ? t("ui.paid_fan_art_sales_in_messages")
                : msg === MESSAGE_REQUEST_BLOCKED
                  ? msg
                  : t("ui.couldn_t_send_message")
      );
    }
  }

  function send() {
    const raw = input.trim();
    if (!raw || sendLockRef.current) return;

    const filtered = filterDmMessageContent(raw);
    if (filtered.wasFiltered) {
      setFilterWarning(filterWarningCopy);
    }

    sendLockRef.current = true;
    setError("");
    stickToBottomRef.current = true;
    setInput("");

    const text = filtered.text;
    const replyToId = replyTarget?.id;
    const replyTo = replyTarget ? replySnapshot(replyTarget) : undefined;
    clearReply();
    const pendingId = addOptimistic(text, undefined, replyTo);

    if (socketReady && socket?.connected) {
      socket.emit("send_message", { roomId, content: text, replyToId });
      queueMicrotask(() => {
        sendLockRef.current = false;
      });
      return;
    }

    void sendViaAction(text, pendingId, undefined, replyToId).finally(() => {
      sendLockRef.current = false;
    });
  }

  async function sendAttachments(attachments: ChatAttachmentInput[], caption?: string) {
    if (!attachments.length || sendLockRef.current) return;

    const filteredCaption = caption?.trim()
      ? filterDmMessageContent(caption.trim())
      : { text: "", wasFiltered: false, matchedRuleIds: [] as string[] };
    if (filteredCaption.wasFiltered) {
      setFilterWarning(filterWarningCopy);
    }

    sendLockRef.current = true;
    setError("");
    stickToBottomRef.current = true;

    const replyToId = replyTarget?.id;
    const replyTo = replyTarget ? replySnapshot(replyTarget) : undefined;
    clearReply();
    const pendingId = addOptimistic(filteredCaption.text || null, attachments, replyTo);

    await sendViaAction(
      filteredCaption.text || null,
      pendingId,
      attachments,
      replyToId
    ).finally(() => {
      sendLockRef.current = false;
    });
  }

  useEffect(() => {
    const raw = searchParams.get("send")?.trim();
    if (!raw || autoSendRef.current) return;
    autoSendRef.current = true;
    stickToBottomRef.current = true;

    const filtered = filterDmMessageContent(raw);
    if (filtered.wasFiltered) {
      setFilterWarning(filterWarningCopy);
    }
    const text = filtered.text;

    const pendingId = addOptimistic(text);
    if (socketReady && socket?.connected) {
      socket.emit("send_message", { roomId, content: text });
    } else {
      void sendViaAction(text, pendingId);
    }
    router.replace(`/messages/${roomId}`, { scroll: false });
  }, [roomId, router, searchParams, socket, socketReady]);

  function removeMessage(messageId: string) {
    if (!communityId || !canDeleteMessages || isPendingMessageId(messageId)) return;
    if (!confirm(t("ui.delete_this_message"))) return;
    void deleteCommunityChatMessage(messageId, communityId).then((res) => {
      if ("error" in res && res.error) setError(errorText(res.error));
      else setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-muted/20">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="chat-messages-container flex-1 overflow-y-auto min-h-0 px-5 sm:px-6 py-5"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t("ui.no_messages_yet")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("ui.say_hello")}
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          if (m.isSystemMessage) {
            return (
              <div key={m.id} className="flex justify-center my-3 px-4">
                <p className="text-xs text-center text-muted-foreground bg-muted/80 border border-border/50 px-3 py-2 rounded-xl max-w-md leading-relaxed">
                  {m.content}
                </p>
              </div>
            );
          }
          const isMine = m.sender.id === userId;
          const pending = isPendingMessageId(m.id);
          const usedShare = parseChatUsedListing(m.content);
          const tradeRequestId = parseUsedTradeRequestMarker(m.content);
          const tradeCaption = tradeRequestId ? stripUsedTradeRequestMarker(m.content) : null;
          const visibleAttachments = (m.attachments ?? []).filter(
            (attachment) => !isUsedListingAttachment(attachment)
          );
          const hasAttachments = visibleAttachments.length > 0;
          const postShare = usedShare || tradeRequestId ? null : parseChatPostShare(m.content);
          const legacyGameNote = stripLegacyGameShareMarker(m.content);
          const atmLetter = parseAtmLetter(m.content);
          const letterTipId = atmLetter ? null : parseLetterDonationMarker(m.content);
          const hasText = usedShare
            ? !!usedShare.note
            : tradeRequestId
              ? !!tradeCaption
              : postShare
                ? !!postShare.note
                : legacyGameNote !== null
                  ? !!legacyGameNote
                  : atmLetter || letterTipId
                    ? false
                    : !!m.content?.trim();
          const showDate = shouldShowDateDivider(prev?.createdAt ?? null, m.createdAt);
          const showTime =
            !messages[i + 1] ||
            messages[i + 1].sender.id !== m.sender.id ||
            shouldShowDateDivider(m.createdAt, messages[i + 1].createdAt);

          const bubbleTouch = bindBubbleTouchSwipe(m);
          const registerMessageRef = (el: HTMLDivElement | null) => {
            if (el) messageRefs.current.set(m.id, el);
            else messageRefs.current.delete(m.id);
          };

          return (
            <div key={m.id} className="w-full">
              {showDate && (
                <div className="date-separator-row">
                  <span className="text-[11px] font-medium text-muted-foreground bg-background/80 border border-border/50 px-3 py-1 rounded-full">
                    {formatDateDivider(m.createdAt, locale)}
                  </span>
                </div>
              )}
              <div
                ref={registerMessageRef}
                className={cn(
                  "message-row group mt-0.5",
                  isMine ? "my-message" : "other-message",
                  pending && isMine && "opacity-80"
                )}
                onContextMenu={(e) => openMessageContextMenu(e, m)}
                onDoubleClick={() => {
                  if (!readOnly) startReply(m);
                }}
                {...bubbleTouch}
              >
                <div className={cn("flex items-end gap-1 min-w-0", isMine && "flex-row-reverse")}>
                  <div className={cn("chat-bubble flex flex-col min-w-0", isMine && "items-end")}>
                  <div className="space-y-1.5">
                    {hasAttachments && (
                      <div
                        className={cn(
                          "overflow-hidden",
                          bubbleHighlightClass(m.id),
                          m.replyTo &&
                            (isMine
                              ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-2xl rounded-bl-md bg-background border border-border/60")
                        )}
                      >
                        {m.replyTo && (
                          <div className="px-3 pt-2">
                            <ChatMessageReplyQuote
                              replyTo={m.replyTo}
                              isMine={isMine}
                              selfUserId={userId}
                              selfUsername={username}
                              onJumpToOriginal={jumpToQuotedMessage}
                            />
                          </div>
                        )}
                        <ChatMessageAttachments
                          attachments={visibleAttachments}
                          isMine={isMine}
                          sellerUsername={m.sender.username}
                          onPurchaseSuccess={() => void refreshPurchasedMedia()}
                        />
                      </div>
                    )}
                    {!hasAttachments && !hasText && !postShare && legacyGameNote === null && !atmLetter && !letterTipId && !usedShare && (
                      <div
                        className={cn(
                          "px-3.5 py-2 text-xs italic rounded-2xl",
                          isMine
                            ? "rounded-br-md bg-primary/15 text-primary"
                            : "rounded-bl-md bg-muted text-muted-foreground"
                        )}
                      >
                        {t("ui.couldn_t_load_media")}
                      </div>
                    )}
                    {hasText && (
                      <div
                        className={cn(
                          "px-3.5 py-2 text-[15px] leading-snug break-words shadow-sm",
                          bubbleHighlightClass(m.id),
                          isMine
                            ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-2xl rounded-bl-md bg-background border border-border/60"
                        )}
                      >
                        {m.replyTo && !hasAttachments && (
                          <ChatMessageReplyQuote
                            replyTo={m.replyTo}
                            isMine={isMine}
                            selfUserId={userId}
                            selfUsername={username}
                            onJumpToOriginal={jumpToQuotedMessage}
                          />
                        )}
                        {usedShare?.note ??
                          tradeCaption ??
                          postShare?.note ??
                          legacyGameNote ??
                          m.content}
                      </div>
                    )}
                    {atmLetter ? (
                      <TransferLetterCard
                        amount={atmLetter.amount}
                        message={atmLetter.message}
                        senderName={m.sender.username}
                        createdAt={m.createdAt}
                      />
                    ) : null}
                    {letterTipId ? (
                      <LetterDonationCard tipId={letterTipId} interactive={!isMine} />
                    ) : null}
                    {usedShare && (
                      <ChatUsedListingCard listingId={usedShare.listingId} />
                    )}
                    {tradeRequestId ? (
                      <ChatUsedTradeRequestCard requestId={tradeRequestId} selfUserId={userId} />
                    ) : null}
                    {postShare && (
                      <div className={cn(hasText && "mt-1")}>
                        {m.replyTo && !hasAttachments && !hasText && (
                          <div
                            className={cn(
                              "mb-1.5 px-3 pt-2 pb-1 rounded-2xl",
                              bubbleHighlightClass(m.id),
                              isMine
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-background border border-border/60"
                            )}
                          >
                            <ChatMessageReplyQuote
                              replyTo={m.replyTo}
                              isMine={isMine}
                              selfUserId={userId}
                              selfUsername={username}
                              onJumpToOriginal={jumpToQuotedMessage}
                            />
                          </div>
                        )}
                        <ChatSharedPostCard postId={postShare.postId} isMine={isMine} />
                      </div>
                    )}
                  </div>
                  {showTime && (
                    <span
                      className={cn(
                        "text-[10px] text-muted-foreground mt-1 tabular-nums",
                        isMine ? "mr-1" : "ml-1"
                      )}
                    >
                      {formatBubbleTime(m.createdAt, locale)}
                    </span>
                  )}
                  </div>
                  {!pending && canDeleteMessages && communityId && (
                    <div className="flex flex-col gap-1 self-end mb-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => removeMessage(m.id)}
                        className="h-7 w-7 rounded-md bg-muted/70 hover:bg-destructive/20 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-80 hover:opacity-100 transition-opacity"
                        aria-label={t("post.menu.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ChatMessageContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        label={t("ui.reply")}
        onReply={() => {
          if (contextMenu) startReply(contextMenu.message);
        }}
        onClose={() => setContextMenu(null)}
      />
      {filterWarning && (
        <p className="text-xs text-amber-700 dark:text-amber-400 px-4 pb-1 text-center">{filterWarning}</p>
      )}
      {error && <p className="text-xs text-destructive px-4 pb-1 text-center">{error}</p>}
      {!readOnly ? <ChatUsedTradePanel roomId={roomId} readOnly={readOnly} /> : null}
      {!readOnly && (
        <div className="shrink-0 border-t border-border/60 bg-background">
          {replyTarget && (
            <ChatReplyComposerBar
              target={replyTarget}
              selfUserId={userId}
              onCancel={clearReply}
            />
          )}
          <ChatMediaComposer
            value={input}
            onChange={setInput}
            onSendText={send}
            onSendAttachments={sendAttachments}
            inputRef={composerInputRef}
          />
        </div>
      )}
      {readOnly && (
        <div className="shrink-0 border-t border-border/60 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
          {readOnlyHint
            ? readOnlyHint
            : userId === "guest"
              ? t("ui.read_only_as_guest_sign_in")
              : t("ui.read_only_join_the_community_from")}
        </div>
      )}
    </div>
  );
}

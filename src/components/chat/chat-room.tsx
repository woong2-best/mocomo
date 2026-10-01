"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ReplyBubbleIcon } from "@/components/icons/reply-bubble-icon";
import type { SupportTierLevel } from "@prisma/client";
import { sendMessage } from "@/actions/chat";
import { deleteCommunityChatMessage } from "@/actions/community-content";
import { useChatSocket } from "@/components/messages/chat-socket-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ChatGameShareCard } from "@/components/chat/chat-game-share-card";
import { ActivityPanel } from "@/components/activities/activity-panel";
import { PresenceAvatar } from "@/components/user/presence-avatar";
import {
  formatBubbleTime,
  formatDateDivider,
  shouldShowAvatar,
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
import { parseChatGameShare } from "@/lib/chat-game-share";
import { parseAtmLetter } from "@/lib/chat-atm-letter";
import { parseLetterDonationMarker } from "@/lib/chat-letter-donation";
import { TransferLetterCard } from "@/components/messages/transfer-letter-stage";
import { LetterDonationCard } from "@/components/donations/letter-donation-card";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { cn } from "@/lib/utils";
import {
  DM_CONTENT_FILTER_WARNING_EN,
  DM_CONTENT_FILTER_WARNING_KO,
  filterDmMessageContent,
} from "@/lib/chat-content-filter";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";
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
  const filterWarningCopy = uiText(locale, DM_CONTENT_FILTER_WARNING_KO, DM_CONTENT_FILTER_WARNING_EN);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [error, setError] = useState("");
  const [filterWarning, setFilterWarning] = useState("");
  const { socket, socketReady, realtimeOff, isUserOnline, subscribeMessages } = useChatSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoSendRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const sendLockRef = useRef(false);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
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
          ? uiText(
              locale,
              `슬로우 모드: ${msg.split(":")[1]}초 후에 다시 보낼 수 있습니다.`,
              `Slow mode: try again in ${msg.split(":")[1]}s.`
            )
          : msg === "CHANNEL_LOCKED"
            ? uiText(locale, "채널이 잠겨 있어 메시지를 보낼 수 없습니다.", "This channel is locked.")
            : msg === "ATTACHMENT_INVALID"
              ? uiText(
                  locale,
                  "첨부 파일을 저장하지 못했습니다. 다시 보내 주세요.",
                  "Couldn't save attachment. Please try again."
                )
              : msg === "PAID_DM_DISABLED"
                ? uiText(
                    locale,
                    "메시지에서 유료 팬아트 판매는 더 이상 지원하지 않습니다.",
                    "Paid fan art sales in messages are no longer supported."
                  )
                : msg === MESSAGE_REQUEST_BLOCKED
                  ? msg
                  : uiText(locale, "메시지 전송에 실패했습니다.", "Couldn't send message.")
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
    if (!confirm(uiText(locale, "이 메시지를 삭제할까요?", "Delete this message?"))) return;
    void deleteCommunityChatMessage(messageId, communityId).then((res) => {
      if ("error" in res && res.error) setError(res.error);
      else setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-muted/20">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 py-4 space-y-1"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {uiText(locale, "아직 메시지가 없어요", "No messages yet")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {uiText(locale, "인사를 건네 보세요 👋", "Say hello 👋")}
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
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
          const gameShare = parseChatGameShare(m.content);
          const atmLetter = parseAtmLetter(m.content);
          const letterTipId = atmLetter ? null : parseLetterDonationMarker(m.content);
          const hasText = usedShare
            ? !!usedShare.note
            : tradeRequestId
              ? !!tradeCaption
              : postShare
                ? !!postShare.note
                : gameShare
                  ? !!gameShare.note
                  : atmLetter || letterTipId
                    ? false
                    : !!m.content?.trim();
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
                    {formatDateDivider(m.createdAt, locale)}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "flex gap-1.5 mb-0.5 group",
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
                <div className={cn("flex items-end gap-1 max-w-[78%] sm:max-w-[70%]", isMine && "flex-row-reverse")}>
                  <div className={cn("flex flex-col min-w-0", isMine && "items-end")}>
                  {!isMine && showAvatar && (
                    <DisplayNameWithSupportTier
                      name={m.sender.username}
                      profileUsername={m.sender.username}
                      tier={m.sender.supportTierSent ?? "SEED"}
                      nameClassName="text-[11px] font-medium text-muted-foreground"
                      compact
                      className="mb-1 ml-1"
                    />
                  )}
                  <div className="space-y-1.5">
                    {hasAttachments && (
                      <div
                        className={cn(
                          "overflow-hidden",
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
                    {!hasAttachments && !hasText && !postShare && !gameShare && !atmLetter && !letterTipId && !usedShare && (
                      <div
                        className={cn(
                          "px-3.5 py-2 text-xs italic rounded-2xl",
                          isMine
                            ? "rounded-br-md bg-primary/15 text-primary"
                            : "rounded-bl-md bg-muted text-muted-foreground"
                        )}
                      >
                        {uiText(locale, "미디어를 불러올 수 없습니다", "Couldn't load media")}
                      </div>
                    )}
                    {hasText && (
                      <div
                        className={cn(
                          "px-3.5 py-2 text-[15px] leading-snug break-words shadow-sm",
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
                          />
                        )}
                        {usedShare?.note ??
                          tradeCaption ??
                          postShare?.note ??
                          gameShare?.note ??
                          m.content}
                      </div>
                    )}
                    {gameShare && (
                      <div className={cn(hasText && "mt-1")}>
                        {m.replyTo && !hasAttachments && !hasText && (
                          <div
                            className={cn(
                              "mb-1.5 px-3 pt-2 pb-1 rounded-2xl",
                              isMine
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-background border border-border/60"
                            )}
                          >
                            <ChatMessageReplyQuote
                              replyTo={m.replyTo}
                              isMine={isMine}
                              selfUserId={userId}
                            />
                          </div>
                        )}
                        <ChatGameShareCard share={gameShare} isMine={isMine} />
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
                              isMine
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-background border border-border/60"
                            )}
                          >
                            <ChatMessageReplyQuote
                              replyTo={m.replyTo}
                              isMine={isMine}
                              selfUserId={userId}
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
                  {!pending && (
                    <div className="flex flex-col gap-1 self-end mb-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startReply(m)}
                        className="h-7 w-7 rounded-md bg-muted/70 hover:bg-muted border border-border/40 flex items-center justify-center text-muted-foreground opacity-80 hover:opacity-100 transition-opacity"
                        aria-label={uiText(locale, "답장", "Reply")}
                      >
                        <ReplyBubbleIcon className="h-3.5 w-3.5" />
                      </button>
                      {canDeleteMessages && communityId && (
                        <button
                          type="button"
                          onClick={() => removeMessage(m.id)}
                          className="h-7 w-7 rounded-md bg-muted/70 hover:bg-destructive/20 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-80 hover:opacity-100 transition-opacity"
                          aria-label={uiText(locale, "삭제", "Delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filterWarning && (
        <p className="text-xs text-amber-700 dark:text-amber-400 px-4 pb-1 text-center">{filterWarning}</p>
      )}
      {error && <p className="text-xs text-destructive px-4 pb-1 text-center">{error}</p>}
      <ActivityPanel />
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
              ? uiText(
                  locale,
                  "게스트 읽기 전용입니다. 로그인 후 커뮤니티에 참여하면 채팅을 보낼 수 있습니다.",
                  "Read-only as guest. Sign in and join the community to chat."
                )
              : uiText(
                  locale,
                  "읽기 전용 모드입니다. 상단에서 커뮤니티에 참여하면 채팅을 보낼 수 있습니다.",
                  "Read-only. Join the community from the header to chat."
                )}
        </div>
      )}
    </div>
  );
}

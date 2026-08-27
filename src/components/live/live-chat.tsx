"use client";

import { memo, useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePlatformChat } from "@/components/live/platform-chat-provider";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import { Send, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LiveSupportEventType, SupportTierLevel } from "@prisma/client";
import { deleteLiveChatMessage } from "@/actions/live-stream";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { ReportButton } from "@/components/report/report-button";
import { relayLiveChatMessage } from "@/hooks/use-live-socket";
import { useLiveChat } from "@/components/live/live-chat-provider";
import { ensureArray } from "@/lib/ensure-array";
import { LiveDonationToolbar } from "@/components/live/live-donation-toolbar";
import { ExternalLiveDonationBar } from "@/components/live/external-live-donation-bar";
import { LiveSupportSidebar } from "@/components/live/live-support-sidebar";
import { LivePinnedMessageBar } from "@/components/live/live-pinned-message-bar";
import { Heart, Target, Sparkles } from "lucide-react";
import {
  CHAT_SOURCE_USERNAME_COLOR,
  type UnifiedChatSource,
} from "@/lib/live-external/platform-chat/merge-messages";

export type LiveChatMessageKind = "chat" | "support" | "tip" | "mission";

export type LiveChatMessage = {
  id: string;
  userId: string;
  username: string;
  content: string;
  at: number;
  image?: string | null;
  supportTierSent?: SupportTierLevel;
  /** MoCoMo DB chat vs imported platform chat */
  source?: "MOCOMO" | "TWITCH" | "YOUTUBE" | "CHZZK";
  /** 후원·룰렛·미션 등 시스템 라인 (DB 저장 없음) */
  messageKind?: LiveChatMessageKind;
  supportAmount?: number;
  eventType?: LiveSupportEventType;
  rouletteLabel?: string;
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
  pinnedMessage,
  externalProvider,
  externalId,
  variant = "default",
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
  /** Streamer pinned notice (links OK) — external live chat header */
  pinnedMessage?: string | null;
  externalProvider?: LiveExternalProvider | null;
  externalId?: string | null;
  variant?: "default" | "external";
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
  const isExternal = variant === "external";
  const { messages: platformMessages, platformConnected } = usePlatformChat();

  const displayMessages = useMemo(() => {
    if (!isExternal || !externalProvider) {
      return messages.map((m) => ({ ...m, source: m.source ?? ("MOCOMO" as const) }));
    }
    const mocomo = messages.map((m) => ({ ...m, source: m.source ?? ("MOCOMO" as const) }));
    const platform = platformMessages.map((m) => ({
      id: m.id,
      userId: m.userId,
      username: m.username,
      content: m.content,
      at: m.at,
      image: m.image,
      source: m.source,
    }));
    const ids = new Set<string>();
    const merged: LiveChatMessage[] = [];
    for (const m of [...mocomo, ...platform].sort((a, b) => a.at - b.at)) {
      if (ids.has(m.id)) continue;
      ids.add(m.id);
      merged.push(m);
    }
    return merged.slice(-150);
  }, [isExternal, externalProvider, messages, platformMessages]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

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

  const platformLabel =
    externalProvider === "TWITCH"
      ? "Twitch"
      : externalProvider === "YOUTUBE"
        ? "YouTube"
        : externalProvider === "CHZZK"
          ? "치지직"
          : null;

  return (
    <div className="flex h-full min-h-[min(70vh,560px)] flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2.5">
        <span className="text-sm font-semibold">
          채팅
          {isExternal ? (
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
              MoCoMo{platformLabel ? ` + ${platformLabel}` : ""}
            </span>
          ) : isHost ? (
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">호스트</span>
          ) : null}
          {connected && (
            <span className="ml-1 text-[10px] font-normal text-green-600 dark:text-green-400">
              MoCoMo 실시간
            </span>
          )}
          {isExternal && platformConnected && platformLabel && (
            <span className="ml-1 text-[10px] font-normal text-violet-600 dark:text-violet-400">
              {platformLabel} 연결
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {viewerCount}
        </span>
      </div>
      {isExternal ? (
        <div className="shrink-0 px-2 pt-2">
          <LivePinnedMessageBar message={pinnedMessage} />
        </div>
      ) : null}
      <LiveSupportSidebar
        channelId={channelId}
        isHost={!!isHost}
        hostDisplayName={hostDisplayName ?? hostUsername ?? "스트리머"}
        hostUserId={hostUserId}
        hostUsername={hostUsername}
        paymentsEnabled={paymentsEnabled}
        hideTopActions={isExternal}
      />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0"
      >
        {historyError && (
          <p className="text-xs text-destructive text-center py-2 px-2">{historyError}</p>
        )}
        {displayMessages.length === 0 && !historyError && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {isExternal && platformLabel
              ? `${platformLabel} 채팅과 MoCoMo 채팅이 여기에 표시됩니다.`
              : "채팅은 DB에 저장됩니다. 첫 메시지를 남겨 보세요."}
          </p>
        )}
        {ensureArray<LiveChatMessage>(displayMessages).map((m) => {
          const isPlatform = !!m.source && m.source !== "MOCOMO";
          const isSupportLine = !!m.messageKind && m.messageKind !== "chat";
          if (isSupportLine) {
            return (
              <SupportChatLine key={m.id} message={m} />
            );
          }
          return (
            <div key={m.id} className="flex gap-2 text-sm group">
              {isPlatform ? (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={m.image ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {m.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserProfileLink username={m.username} className="shrink-0 rounded-full">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={m.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {m.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </UserProfileLink>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  {isPlatform ? (
                    <span
                      className="font-semibold text-xs"
                      style={{ color: chatSourceColor(m.source!) }}
                    >
                      {m.username}
                    </span>
                  ) : (
                    <>
                      <DisplayNameWithSupportTier
                        name={
                          <span
                            className="font-semibold text-xs"
                            style={{ color: CHAT_SOURCE_USERNAME_COLOR.MOCOMO }}
                          >
                            @{m.username}
                          </span>
                        }
                        profileUsername={m.username}
                        tier={m.supportTierSent ?? "SEED"}
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
                      {session?.user &&
                        m.userId !== session.user.id &&
                        !m.id.startsWith("pending-") && (
                          <ReportButton
                            targetType="LIVE_CHAT"
                            targetId={m.id}
                            reportedUserId={m.userId}
                            label="신고"
                            variant="ghost"
                            size="sm"
                          />
                        )}
                    </>
                  )}
                </div>
                <p className="text-sm break-words leading-snug mt-0.5">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {session?.user ? (
        <div className="shrink-0 space-y-2 border-t border-border/60 p-2.5">
          {isExternal ? (
            <ExternalLiveDonationBar
              channelId={channelId}
              hostDisplayName={hostDisplayName ?? hostUsername ?? "스트리머"}
              hostUserId={hostUserId}
              hostUsername={hostUsername}
              paymentsEnabled={paymentsEnabled}
              isHost={isHost}
            />
          ) : (
            <LiveDonationToolbar
              channelId={channelId}
              hostDisplayName={hostDisplayName ?? hostUsername ?? "스트리머"}
              hostUserId={hostUserId}
              hostUsername={hostUsername}
              paymentsEnabled={paymentsEnabled}
              isHost={isHost}
            />
          )}
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
              placeholder="채팅 입력…"
              className="h-9 rounded-lg text-sm"
              maxLength={200}
              disabled={sending}
            />
            <Button
              size="sm"
              className="h-9 shrink-0 rounded-lg bg-folk-terracotta px-3 hover:bg-folk-terracotta/90"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="shrink-0 p-3 text-center text-xs text-muted-foreground">
          채팅하려면 로그인하세요
        </p>
      )}
    </div>
  );
}

function chatSourceColor(source: NonNullable<LiveChatMessage["source"]>): string {
  return CHAT_SOURCE_USERNAME_COLOR[source as UnifiedChatSource];
}

function SupportChatLine({ message }: { message: LiveChatMessage }) {
  const kind = message.messageKind ?? "support";
  const Icon =
    kind === "tip" ? Sparkles : kind === "mission" ? Target : Heart;
  const tone =
    kind === "tip"
      ? "border-amber-400/35 bg-amber-500/10"
      : kind === "mission"
        ? "border-violet-400/35 bg-violet-500/10"
        : message.eventType === "ROULETTE"
          ? "border-emerald-400/35 bg-emerald-500/10"
          : "border-yellow-400/35 bg-yellow-500/10";
  const label =
    kind === "tip"
      ? "후원"
      : kind === "mission"
        ? "미션"
        : message.eventType === "ROULETTE"
          ? "룰렛"
          : message.eventType === "TTS"
            ? "TTS"
            : message.eventType === "SOUND"
              ? "사운드"
              : message.eventType === "VOTE"
                ? "투표"
                : "응원";

  return (
    <div
      className={`rounded-lg border px-2.5 py-2 text-sm leading-snug ${tone}`}
    >
      <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </div>
      <p className="break-words font-medium">{message.content}</p>
    </div>
  );
}

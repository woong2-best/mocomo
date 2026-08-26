"use client";

import { useObsChatFeed } from "@/hooks/use-obs-chat-feed";
import {
  OVERLAY_SOURCE_USERNAME_COLOR,
  UNIFIED_CHAT_SOURCE_LABEL,
  type UnifiedChatSource,
} from "@/lib/live-external/platform-chat/merge-messages";

export function OverlayChatClient({
  channelId,
  token,
}: {
  channelId: string;
  token: string;
}) {
  const { messages, meta, platformReady, platformError, state, error } = useObsChatFeed(
    channelId,
    token
  );

  const waitingText =
    platformError ??
    (platformReady
      ? "연결됨 · 채팅이 오면 여기에 표시됩니다"
      : meta
        ? `${UNIFIED_CHAT_SOURCE_LABEL[meta.provider]} 채팅 연결 중…`
        : "채팅 대기 중…");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 8,
        padding: 16,
        minHeight: "100vh",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {state === "loading" ? <StatusLine text="채팅 연결 중…" /> : null}
      {state === "error" ? <StatusLine text={error ?? "오류"} warn /> : null}
      {state === "ended" ? <StatusLine text="방송이 종료되었습니다." dim /> : null}
      {state === "live" && messages.length === 0 ? (
        <StatusLine text={waitingText} warn={!!platformError} />
      ) : null}

      {messages.map((m) => (
        <div
          key={m.id}
          style={{
            color: "#fff",
            textShadow: "0 2px 4px rgba(0,0,0,0.95)",
            fontSize: 26,
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {m.source !== "MOCOMO" ? (
            <span
              style={{
                display: "inline-block",
                marginRight: 8,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: OVERLAY_SOURCE_USERNAME_COLOR[m.source],
              }}
            >
              {UNIFIED_CHAT_SOURCE_LABEL[m.source]}
            </span>
          ) : null}
          <strong style={{ color: usernameColor(m.source) }}>{m.username}</strong>
          <span style={{ marginLeft: 10 }}>{m.content}</span>
        </div>
      ))}
    </div>
  );
}

function StatusLine({
  text,
  dim,
  warn,
}: {
  text: string;
  dim?: boolean;
  warn?: boolean;
}) {
  return (
    <p
      style={{
        color: warn
          ? "#ffb4a2"
          : dim
            ? "rgba(255,255,255,0.6)"
            : "rgba(255,255,255,0.92)",
        textAlign: "left",
        fontSize: warn ? 22 : 20,
        fontWeight: 600,
        textShadow: "0 2px 4px rgba(0,0,0,0.95)",
        margin: "4px 0 8px",
        lineHeight: 1.45,
      }}
    >
      {text}
    </p>
  );
}

function usernameColor(source: UnifiedChatSource): string {
  return OVERLAY_SOURCE_USERNAME_COLOR[source];
}

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
  const { messages, meta, platformReady, state, error } = useObsChatFeed(channelId, token);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 6,
        padding: 12,
        minHeight: "100vh",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {state === "loading" ? (
        <StatusLine text="채팅 연결 중…" />
      ) : null}
      {state === "error" ? <StatusLine text={error ?? "오류"} dim /> : null}
      {state === "ended" ? <StatusLine text="방송이 종료되었습니다." dim /> : null}
      {state === "live" && messages.length === 0 ? (
        <StatusLine
          text={
            platformReady
              ? "연결됨 · 채팅이 오면 여기에 표시됩니다"
              : meta
                ? `${UNIFIED_CHAT_SOURCE_LABEL[meta.provider]} 채팅 연결 중…`
                : "채팅 대기 중…"
          }
        />
      ) : null}

      {messages.map((m) => (
        <div
          key={m.id}
          style={{
            color: "#fff",
            textShadow: "0 1px 3px rgba(0,0,0,0.85)",
            fontSize: 18,
            lineHeight: 1.35,
            wordBreak: "break-word",
          }}
        >
          {m.source !== "MOCOMO" ? (
            <span
              style={{
                display: "inline-block",
                marginRight: 6,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: OVERLAY_SOURCE_USERNAME_COLOR[m.source],
                opacity: 0.95,
              }}
            >
              {UNIFIED_CHAT_SOURCE_LABEL[m.source]}
            </span>
          ) : null}
          <strong style={{ color: usernameColor(m.source) }}>{m.username}</strong>
          <span style={{ marginLeft: 8 }}>{m.content}</span>
        </div>
      ))}
    </div>
  );
}

function StatusLine({ text, dim }: { text: string; dim?: boolean }) {
  return (
    <p
      style={{
        color: dim ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.75)",
        textAlign: "center",
        fontSize: 13,
        textShadow: "0 1px 2px rgba(0,0,0,0.85)",
        margin: "8px 0",
      }}
    >
      {text}
    </p>
  );
}

function usernameColor(source: UnifiedChatSource): string {
  return OVERLAY_SOURCE_USERNAME_COLOR[source];
}

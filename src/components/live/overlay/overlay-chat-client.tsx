"use client";

import { useObsChatFeed } from "@/hooks/use-obs-chat-feed";
import {
  UNIFIED_CHAT_SOURCE_LABEL,
  chatUsernameColor,
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

      {messages.map((m) => {
        const isSupport = !!m.messageKind;
        const supportColor =
          m.messageKind === "tip"
            ? "#fcd34d"
            : m.messageKind === "mission"
              ? "#c4b5fd"
              : m.eventType === "ROULETTE"
                ? "#6ee7b7"
                : "#fde047";
        return (
        <div
          key={m.id}
          style={{
            color: isSupport ? supportColor : "#fff",
            textShadow: "0 2px 4px rgba(0,0,0,0.95)",
            fontSize: isSupport ? 24 : 26,
            lineHeight: 1.4,
            wordBreak: "break-word",
            fontWeight: isSupport ? 700 : 400,
            padding: isSupport ? "4px 0" : undefined,
            borderLeft: isSupport ? `4px solid ${supportColor}` : undefined,
            paddingLeft: isSupport ? 10 : undefined,
          }}
        >
          {!isSupport ? (
            <>
              <strong style={{ color: chatUsernameColor(m.source) }}>{m.username}</strong>
              <span style={{ marginLeft: 10, color: "#fff" }}>{m.content}</span>
            </>
          ) : (
            <span>{m.content}</span>
          )}
        </div>
        );
      })}
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

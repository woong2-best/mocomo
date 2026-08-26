"use client";

import { useOverlayUnifiedChat } from "@/hooks/use-overlay-unified-chat";
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
  const { messages, streamEnded } = useOverlayUnifiedChat(channelId, token);

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
      {streamEnded ? (
        <p
          style={{
            color: "rgba(255,255,255,0.65)",
            textAlign: "center",
            fontSize: 14,
            textShadow: "0 1px 2px rgba(0,0,0,0.85)",
          }}
        >
          방송이 종료되었습니다.
        </p>
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

function usernameColor(source: UnifiedChatSource): string {
  return OVERLAY_SOURCE_USERNAME_COLOR[source];
}

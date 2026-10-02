"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
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
  const { t } = useLocale();
  const { messages, meta, platformReady, platformError, state, error } = useObsChatFeed(
    channelId,
    token
  );

  const waitingText =
    platformError ??
    (platformReady
      ? t("live.s1yphknj")
      : meta
        ? t("live.sh1cmpi", { v0: UNIFIED_CHAT_SOURCE_LABEL[meta.provider] })
        : t("live.se7nb0m"));

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
      {state === "loading" ? <StatusLine text={t("live.sh1cmpi")} /> : null}
      {state === "error" ? <StatusLine text={error ?? t("live.sypx0")} warn /> : null}
      {state === "ended" ? <StatusLine text={t("live.sa8v8bc")} dim /> : null}
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

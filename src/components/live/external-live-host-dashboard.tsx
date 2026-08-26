"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquare,
  Monitor,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mintLiveOverlayUrls } from "@/actions/live-external";
import { useLiveChatOptional } from "@/components/live/live-chat-provider";
import { usePlatformChat } from "@/components/live/platform-chat-provider";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import { UNIFIED_CHAT_SOURCE_LABEL } from "@/lib/live-external/platform-chat/merge-messages";
import { providerDisplayName } from "@/lib/live-external/platform-metadata";

type Props = {
  channelId: string;
  provider: LiveExternalProvider;
};

function StatusDot({ ok }: { ok: boolean | null }) {
  const color =
    ok === true ? "bg-green-500" : ok === false ? "bg-amber-500" : "bg-muted-foreground/40";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}

/** Host-only panel: platform/chat/OBS status for external live rooms. */
export function ExternalLiveHostDashboard({ channelId, provider }: Props) {
  const chat = useLiveChatOptional();
  const platform = usePlatformChat();
  const [expanded, setExpanded] = useState(false);
  const [platformOnAir, setPlatformOnAir] = useState<boolean | null>(null);
  const [overlayUrls, setOverlayUrls] = useState<{ chat: string; donation: string } | null>(null);
  const [copied, setCopied] = useState<"chat" | "donation" | null>(null);

  const platformLabel = providerDisplayName(provider);
  const mocomoCount = chat?.messages.length ?? 0;
  const platformCount = platform.messages.length;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/live/${channelId}/external-status`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { platformOnAir?: boolean | null };
        if (!cancelled) setPlatformOnAir(data.platformOnAir ?? null);
      } catch {
        /* ignore */
      }
    }

    void poll();
    const id = setInterval(() => void poll(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId]);

  useEffect(() => {
    let cancelled = false;
    void mintLiveOverlayUrls(channelId).then((res) => {
      if (cancelled || "error" in res) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setOverlayUrls({
        chat: `${origin}${res.chatUrl}`,
        donation: `${origin}${res.donationUrl}`,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const copy = useCallback(async (text: string, kind: "chat" | "donation") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const statusRows = useMemo(
    () => [
      {
        label: "MoCoMo 실시간",
        ok: chat?.connected ?? null,
        detail: chat?.connected ? "소켓 연결됨" : "연결 대기",
      },
      {
        label: `${platformLabel} 채팅`,
        ok: platform.platformConnected,
        detail: platform.platformConnected ? "수신 중" : "연결 대기",
      },
      {
        label: `${platformLabel} 방송`,
        ok: platformOnAir,
        detail:
          platformOnAir === true
            ? "온에어"
            : platformOnAir === false
              ? "종료됨"
              : "확인 중",
      },
    ],
    [chat?.connected, platform.platformConnected, platformLabel, platformOnAir]
  );

  return (
    <div className="mb-3 rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Radio className="h-4 w-4 shrink-0 text-folk-terracotta" />
          <span className="text-sm font-medium">호스트 대시보드</span>
          <span className="truncate text-xs text-muted-foreground">
            MoCoMo {mocomoCount} · {UNIFIED_CHAT_SOURCE_LABEL[provider]} {platformCount}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded ? (
        <div className="space-y-3 border-t px-3 pb-3 pt-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {statusRows.map((row) => (
              <div
                key={row.label}
                className="flex items-start gap-2 rounded-lg bg-muted/40 px-2.5 py-2"
              >
                <StatusDot ok={row.ok} />
                <div className="min-w-0">
                  <p className="text-xs font-medium">{row.label}</p>
                  <p className="text-[11px] text-muted-foreground">{row.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" />
              OBS 브라우저 소스
            </p>
            {overlayUrls ? (
              <div className="space-y-2">
                <OverlayUrlRow
                  label="통합 채팅 (MoCoMo + 플랫폼)"
                  url={overlayUrls.chat}
                  copied={copied === "chat"}
                  onCopy={() => void copy(overlayUrls.chat, "chat")}
                />
                <OverlayUrlRow
                  label="후원 알림"
                  url={overlayUrls.donation}
                  copied={copied === "donation"}
                  onCopy={() => void copy(overlayUrls.donation, "donation")}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">오버레이 URL 불러오는 중…</p>
            )}
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              채팅 오버레이는 MoCoMo DB 채팅과 {platformLabel} 채팅을 시간순으로 합쳐
              표시합니다. Twitch·치지직은 WebSocket, YouTube는 서버 폴링을 사용합니다.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OverlayUrlRow({
  label,
  url,
  copied,
  onCopy,
}: {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border bg-background/60 p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={onCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <p className="break-all font-mono text-[10px] text-muted-foreground">{url}</p>
    </div>
  );
}

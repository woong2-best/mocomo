"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Monitor, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mintLiveOverlayUrls } from "@/actions/live-external";
import { useLiveChatOptional } from "@/components/live/live-chat-provider";
import { usePlatformChat } from "@/components/live/platform-chat-provider";
import { YoutubeObsQuickSetup } from "@/components/live/youtube-obs-quick-setup";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import { UNIFIED_CHAT_SOURCE_LABEL } from "@/lib/live-external/platform-chat/merge-messages";
import { providerDisplayName } from "@/lib/live-external/platform-metadata";

type Props = {
  channelId: string;
  provider: LiveExternalProvider;
  externalId: string;
};

function StatusDot({ ok }: { ok: boolean | null }) {
  const color =
    ok === true ? "bg-green-500" : ok === false ? "bg-amber-500" : "bg-muted-foreground/40";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}

/** Host-only panel: OBS chat URL + live status. */
export function ExternalLiveHostDashboard({ channelId, provider, externalId }: Props) {
  const chat = useLiveChatOptional();
  const platform = usePlatformChat();
  const [expanded, setExpanded] = useState(true);
  const [platformOnAir, setPlatformOnAir] = useState<boolean | null>(null);
  const [obsChatUrl, setObsChatUrl] = useState<string | null>(null);
  const [donationUrl, setDonationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"chat" | "donation" | null>(null);

  const platformLabel = providerDisplayName(provider);
  const mocomoCount = chat?.messages.length ?? 0;
  const platformCount = platform.messages.length;
  const videoId = externalId.trim();
  const isYoutube = provider === "YOUTUBE";

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
      setObsChatUrl(`${origin}${res.chatUrl}`);
      setDonationUrl(`${origin}${res.donationUrl}`);
    });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const copyText = useCallback(async (text: string, kind: "chat" | "donation") => {
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
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Monitor className="h-4 w-4 text-primary" />
              OBS 채팅 URL (댓글만)
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              OBS → 브라우저 소스 → <strong className="text-foreground">URL란에 아래 주소만</strong>{" "}
              붙여넣기. MoCoMo 사이트 화면이 아니라 <strong className="text-foreground">채팅
              댓글만</strong> 나옵니다. CSS 불필요 · 450×700 · 배경 투명 ✓
            </p>
            {obsChatUrl ? (
              <>
                <Button
                  type="button"
                  className="mt-3 h-11 w-full gap-2 text-sm font-semibold"
                  onClick={() => void copyText(obsChatUrl, "chat")}
                >
                  {copied === "chat" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied === "chat" ? "URL 복사됨 — OBS URL란에 붙여넣기" : "OBS 채팅 URL 복사"}
                </Button>
                <p className="mt-2 break-all rounded-md bg-background/80 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                  {obsChatUrl}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">URL 불러오는 중…</p>
            )}
          </div>

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

          <details className="rounded-lg border bg-muted/20 px-2.5 py-2 text-[11px]">
            <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
              후원 알림 · YouTube 네이티브 (선택)
            </summary>
            <div className="mt-2 space-y-2">
              {donationUrl ? (
                <div className="rounded-lg border bg-background/60 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">후원 알림 URL</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2"
                      onClick={() => void copyText(donationUrl, "donation")}
                    >
                      {copied === "donation" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied === "donation" ? "복사됨" : "복사"}
                    </Button>
                  </div>
                  <p className="break-all font-mono text-[10px] text-muted-foreground">
                    {donationUrl}
                  </p>
                </div>
              ) : null}
              {isYoutube && videoId ? <YoutubeObsQuickSetup videoId={videoId} /> : null}
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}

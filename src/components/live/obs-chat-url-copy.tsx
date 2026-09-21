"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mintLiveOverlayUrls, mintStudioObsChatUrl } from "@/actions/live-external";
import { cn } from "@/lib/utils";

type Props = {
  /** Active live channel — host dashboard. Omit to mint from Live Studio. */
  channelId?: string;
  /** compact = single small button (live room); full = studio block */
  variant?: "compact" | "full";
  className?: string;
};

/**
 * OBS browser-source chat URL copy.
 * compact: one tiny button on the live host bar.
 * full: studio section with short hint.
 */
export function ObsChatUrlCopy({
  channelId,
  variant = "full",
  className,
}: Props) {
  const [obsChatUrl, setObsChatUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setObsChatUrl(null);

    void (async () => {
      const res = channelId
        ? await mintLiveOverlayUrls(channelId)
        : await mintStudioObsChatUrl();
      if (cancelled) return;
      if ("error" in res && res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      if ("chatUrl" in res && res.chatUrl) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setObsChatUrl(`${origin}${res.chatUrl}`);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const copyUrl = useCallback(async () => {
    if (!obsChatUrl) return;
    try {
      await navigator.clipboard.writeText(obsChatUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [obsChatUrl]);

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
          disabled={!obsChatUrl || loading}
          onClick={() => void copyUrl()}
          title={obsChatUrl ?? error ?? "OBS 채팅 URL"}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "복사됨" : "OBS URL"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card/80 p-4 space-y-3",
        className
      )}
    >
      <div>
        <h2 className="font-display font-bold text-folk-cobalt text-base">OBS 채팅 URL</h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          진행 중 방송의 OBS 브라우저 소스 URL입니다. YouTube·Twitch·MoCoMo 댓글과
          채팅후원·룰렛·유료후원 알림이 이 URL 하나로 표시됩니다. 후원 알림은 방송 설정에서
          켜 두세요.
        </p>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          URL 불러오는 중…
        </p>
      ) : error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : obsChatUrl ? (
        <>
          <Button
            type="button"
            className="w-full sm:w-auto gap-2 font-semibold rounded-xl"
            onClick={() => void copyUrl()}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "복사됨" : "OBS 채팅 URL 복사"}
          </Button>
          <p className="break-all font-mono text-[10px] text-muted-foreground">{obsChatUrl}</p>
        </>
      ) : null}
    </div>
  );
}

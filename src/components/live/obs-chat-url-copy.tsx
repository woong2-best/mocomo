"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mintLiveOverlayUrls, mintStudioObsChatUrl } from "@/actions/live-external";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

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
  const { t } = useLocale();
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
          title={obsChatUrl ?? error ?? t("live.obsChat.title")}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? t("live.obsChat.copied") : t("live.obsChat.compactLabel")}
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
        <h2 className="font-display font-bold text-folk-cobalt text-base">{t("live.obsChat.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t("live.obsChat.desc")}</p>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("live.obsChat.loading")}
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
            {copied ? t("live.obsChat.copied") : t("live.obsChat.copy")}
          </Button>
          <p className="break-all font-mono text-[10px] text-muted-foreground">{obsChatUrl}</p>
        </>
      ) : null}
    </div>
  );
}

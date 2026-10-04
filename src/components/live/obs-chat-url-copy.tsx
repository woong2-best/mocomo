"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mintLiveOverlayUrls, mintStudioObsChatUrl } from "@/actions/live-external";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

type OverlayUrls = { chat: string; video: string; chatTip: string };

type Props = {
  /** Active live channel — host dashboard. Omit to mint from Live Studio. */
  channelId?: string;
  /** Server-rendered Live Studio links. Shown immediately, before any client fetch. */
  initialUrls?: OverlayUrls | null;
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
  initialUrls,
  variant = "full",
  className,
}: Props) {
  const { t } = useLocale();
  const [urls, setUrls] = useState<OverlayUrls | null>(initialUrls ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialUrls);
  const [copied, setCopied] = useState<"chat" | "video" | "chatTip" | null>(null);

  useEffect(() => {
    if (initialUrls) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUrls(null);

    void (async () => {
      const res = channelId
        ? await mintLiveOverlayUrls(channelId)
        : await mintStudioObsChatUrl();
      if (cancelled) return;
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        setLoading(false);
        return;
      }
      if ("chatUrl" in res && res.chatUrl) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const abs = (path: string | null | undefined) => (path ? `${origin}${path}` : "");
        setUrls({
          chat: abs(res.chatUrl),
          video: "mocoWidgetUrl" in res ? abs(res.mocoWidgetUrl) : "",
          chatTip: "donationUrl" in res ? abs(res.donationUrl) : "",
        });
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId, initialUrls]);

  const copyUrl = useCallback(async (kind: "chat" | "video" | "chatTip", value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
          disabled={!urls?.chat || loading}
          onClick={() => void copyUrl("chat", urls?.chat ?? "")}
          title={urls?.chat ?? error ?? t("live.obsChat.title")}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : copied === "chat" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied === "chat" ? t("live.obsChat.copied") : t("live.obsChat.compactLabel")}
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
      ) : urls ? (
        <ul className="space-y-3">
          {(
            [
              ["chat", t("live.obsChat.chat"), urls.chat],
              ["video", t("live.obsChat.videoDonation"), urls.video],
              ["chatTip", t("live.obsChat.chatDonation"), urls.chatTip],
            ] as const
          ).map(([kind, label, value]) =>
            value ? (
              <li key={kind} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{label}</p>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg"
                    onClick={() => void copyUrl(kind, value)}
                  >
                    {copied === kind ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === kind ? t("live.obsChat.copied") : t("live.obsChat.copy")}
                  </Button>
                </div>
                <input
                  readOnly
                  value={value}
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label={label}
                  className="w-full break-all rounded-md border border-border bg-muted/50 px-2 py-1.5 font-mono text-[11px] text-foreground"
                />
              </li>
            ) : null
          )}
        </ul>
      ) : null}
    </div>
  );
}

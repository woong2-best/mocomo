"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { useCallback, useState } from "react";
import { AlertTriangle, Check, Copy, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildYoutubeObsSetupClipboard,
  YOUTUBE_OBS_CHAT_CSS_PATH,
  youtubeLiveChatPopoutUrl,
} from "@/lib/live-external/youtube-obs-chat";

type Props = {
  videoId: string;
  /** Compact layout for inline hints */
  variant?: "card" | "compact";
};

/**
 * YouTube OBS chat: URL + CSS copied separately (OBS has two fields).
 * Native popout — best emoji / Super Chat fidelity.
 */
export function YoutubeObsQuickSetup({
  videoId, variant = "card" }: Props) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<"url" | "css" | "guide" | null>(null);
  const popoutUrl = youtubeLiveChatPopoutUrl(videoId);

  const flash = useCallback((kind: typeof copied) => {
    setCopied(kind);
    setTimeout(() => setCopied(null), 2500);
  }, []);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(popoutUrl);
      flash("url");
    } catch {
      /* ignore */
    }
  }, [popoutUrl, flash]);

  const copyCss = useCallback(async () => {
    try {
      const res = await fetch(YOUTUBE_OBS_CHAT_CSS_PATH, { cache: "no-store" });
      if (!res.ok) return;
      await navigator.clipboard.writeText(await res.text());
      flash("css");
    } catch {
      /* ignore */
    }
  }, [flash]);

  const copyGuide = useCallback(async () => {
    try {
      const cssRes = await fetch(YOUTUBE_OBS_CHAT_CSS_PATH, { cache: "no-store" });
      if (!cssRes.ok) return;
      const css = await cssRes.text();
      await navigator.clipboard.writeText(buildYoutubeObsSetupClipboard(popoutUrl, css));
      flash("guide");
    } catch {
      /* ignore */
    }
  }, [popoutUrl, flash]);

  if (variant === "compact") {
    return (
      <Button
        type="button"
        size="sm"
        className="gap-1.5 bg-red-600 hover:bg-red-600/90"
        onClick={() => void copyUrl()}
      >
        {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === "url" ? t("live.url_5") : t("live.youtube_url_2")}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-red-500/25 bg-gradient-to-br from-red-500/10 to-transparent p-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Youtube className="h-4 w-4 text-red-500" />
          {t("live.youtube")}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("live.obs_26")} <strong className="font-medium text-foreground">URL</strong>과{" "}
          <strong className="font-medium text-foreground">CSS</strong>를{" "}
          <em>{t("live.s1gnhjl8")}</em>{t("live.url_3")}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="h-10 gap-2 bg-red-600 text-sm font-semibold hover:bg-red-600/90"
          onClick={() => void copyUrl()}
        >
          {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied === "url" ? t("live.url_5") : t("live.url_obs_url")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 text-sm font-semibold"
          onClick={() => void copyCss()}
        >
          {copied === "css" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied === "css" ? t("live.css_2") : t("live.css_css")}
        </Button>
      </div>

      <ol className="space-y-1 text-[11px] text-muted-foreground">
        <li>{t("live.s18p2mfk")} <strong className="text-foreground">450 × 700</strong> {t("live.sphxlt0")}</li>
        <li>{t("live.s1acp6ms")}</li>
        <li>{t("live.s17xbriy")} <strong className="text-foreground">{t("auth.reload")}</strong></li>
      </ol>

      <p className="break-all rounded-md bg-background/70 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
        {popoutUrl}
      </p>

      <details className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-[11px]">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t("live.stbkidh")}
        </summary>
        <ul className="mt-2 space-y-1.5 pl-1 text-muted-foreground">
          <li>
            · OBS <strong className="text-foreground">{t("live.30_2_3")}</strong> {t("live.youtube_css_obs")}
          </li>
          <li>{t("live.url_4")} <code className="text-[10px]">live_chat?is_popout=1</code> {t("live.sq5tjaq")}</li>
          <li>{t("live.css_css_url")}</li>
          <li>{t("live.youtube_2")}</li>
          <li>
            {t("live.s1ah5ftn")} <strong className="text-foreground">{t("live.mocomo_6")}</strong>
            {t("live.css")}
          </li>
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-7 px-2 text-[11px]"
          onClick={() => void copyGuide()}
        >
          {copied === "guide" ? t("live.sh0rjt") : t("live.s1x6glei")}
        </Button>
      </details>
    </div>
  );
}

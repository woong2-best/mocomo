"use client";

import { useCallback, useMemo, useState } from "react";
import { Languages } from "lucide-react";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { LinkPreviewCard } from "@/components/ui/link-preview-card";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/i18n/config";
import { extractFirstHttpUrl, isUrlOnlyContent } from "@/lib/link-preview-shared";
import {
  detectTextLanguage,
  needsTranslation,
  sourceLanguageLabel,
} from "@/lib/text-language";
import { cn } from "@/lib/utils";

export function TranslatableText({
  text,
  className,
  as = "span",
  stopPropagation = false,
  showLinkPreview = true,
}: {
  text: string;
  className?: string;
  as?: "p" | "span" | "div";
  stopPropagation?: boolean;
  /** 본문 첫 URL의 OG/유튜브 카드 (기본 on) */
  showLinkPreview?: boolean;
}) {
  const { locale, t } = useLocale();
  const detected = useMemo(() => detectTextLanguage(text), [text]);
  const showTranslate = useMemo(() => needsTranslation(text, locale), [text, locale]);
  const hasPreviewUrl = useMemo(
    () => showLinkPreview && Boolean(extractFirstHttpUrl(text)),
    [showLinkPreview, text]
  );
  const urlOnly = useMemo(() => isUrlOnlyContent(text), [text]);

  const [showTranslated, setShowTranslated] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<Locale | null>(detected);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // Hide raw URL only after card is ready — use CSS `hidden`, never remount the card.
  const hideUrlOnlyBody = hasPreviewUrl && urlOnly && previewReady;
  const displayText = showTranslated && translated ? translated : text;

  const fetchTranslation = useCallback(async () => {
    if (translated) {
      setShowTranslated(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        translated?: string;
        sourceLang?: Locale | null;
      };
      if (!res.ok || !data.ok || !data.translated) {
        setFailed(true);
        return;
      }
      setTranslated(data.translated);
      if (data.sourceLang) setSourceLang(data.sourceLang);
      setShowTranslated(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [text, locale, translated]);

  const body = (
    <div
      // Keep this node mounted so LinkPreviewCard sibling position never changes.
      className={cn(hideUrlOnlyBody && "hidden")}
      aria-hidden={hideUrlOnlyBody || undefined}
    >
      <LinkifiedText
        text={showTranslate ? displayText : text}
        as={as}
        className={cn(className, showTranslate && showTranslated && "text-foreground")}
        stopPropagation={stopPropagation}
      />
    </div>
  );

  const preview = hasPreviewUrl ? (
    <LinkPreviewCard
      key="link-preview"
      text={text}
      stopPropagation={stopPropagation}
      onReady={setPreviewReady}
    />
  ) : null;

  if (!hasPreviewUrl && !showTranslate) {
    return (
      <LinkifiedText
        text={text}
        as={as}
        className={className}
        stopPropagation={stopPropagation}
      />
    );
  }

  return (
    <div className="min-w-0">
      {showTranslate && (
        <div className="flex items-center gap-1.5 text-sm mb-1">
          <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {showTranslated && sourceLang ? (
            <>
              <span className="text-muted-foreground">
                {t("translate.sourceLanguage", {
                  language: sourceLanguageLabel(sourceLang, locale),
                })}
              </span>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                className="text-primary hover:underline disabled:opacity-50"
                disabled={loading}
                onClick={(e) => {
                  if (stopPropagation) e.stopPropagation();
                  setShowTranslated(false);
                }}
              >
                {t("translate.viewOriginal")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-primary hover:underline disabled:opacity-50"
              disabled={loading}
              onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
                void fetchTranslation();
              }}
            >
              {loading ? t("translate.loading") : t("translate.viewTranslation")}
            </button>
          )}
          {failed && (
            <span className="text-xs text-destructive">{t("translate.failed")}</span>
          )}
        </div>
      )}
      {body}
      {preview}
    </div>
  );
}

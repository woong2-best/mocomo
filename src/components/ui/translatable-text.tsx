"use client";

import { useMemo, useState } from "react";
import { Languages } from "lucide-react";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { LinkPreviewCard } from "@/components/ui/link-preview-card";
import { useLocale } from "@/components/providers/locale-provider";
import { useAutoClientTranslation } from "@/hooks/use-auto-client-translate";
import { needsClientTranslation } from "@/lib/client-translate/detect-source";
import { extractFirstHttpUrl, isUrlOnlyContent } from "@/lib/link-preview-shared";
import { sourceLanguageLabel } from "@/lib/text-language";
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
  const showTranslate = useMemo(() => needsClientTranslation(text, locale), [text, locale]);
  const hasPreviewUrl = useMemo(
    () => showLinkPreview && Boolean(extractFirstHttpUrl(text)),
    [showLinkPreview, text]
  );
  const urlOnly = useMemo(() => isUrlOnlyContent(text), [text]);

  const {
    rootRef,
    displayText,
    translated,
    sourceLang,
    loading,
    failed,
    showOriginal,
    setShowOriginal,
  } = useAutoClientTranslation(text, locale);

  const [previewReady, setPreviewReady] = useState(false);

  const hideUrlOnlyBody = hasPreviewUrl && urlOnly && previewReady;
  const showingTranslation = showTranslate && Boolean(translated) && !showOriginal;

  const body = (
    <div
      className={cn(hideUrlOnlyBody && "hidden")}
      aria-hidden={hideUrlOnlyBody || undefined}
    >
      <LinkifiedText
        text={showTranslate ? displayText : text}
        as={as}
        className={cn(className, showingTranslation && "text-foreground")}
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
    <div ref={rootRef} className="min-w-0">
      {showTranslate && (
        <div className="flex items-center gap-1.5 text-sm mb-1">
          <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {showingTranslation && sourceLang ? (
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
                  setShowOriginal(true);
                }}
              >
                {t("translate.viewOriginal")}
              </button>
            </>
          ) : showOriginal && translated ? (
            <button
              type="button"
              className="text-primary hover:underline disabled:opacity-50"
              disabled={loading}
              onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
                setShowOriginal(false);
              }}
            >
              {t("translate.viewTranslation")}
            </button>
          ) : loading ? (
            <span className="text-muted-foreground">{t("translate.loading")}</span>
          ) : failed ? (
            <span className="text-xs text-destructive">{t("translate.failed")}</span>
          ) : null}
        </div>
      )}
      {body}
      {preview}
    </div>
  );
}

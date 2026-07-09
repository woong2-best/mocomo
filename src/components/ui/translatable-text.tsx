"use client";

import { useCallback, useMemo, useState } from "react";
import { Languages } from "lucide-react";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/i18n/config";
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
}: {
  text: string;
  className?: string;
  as?: "p" | "span" | "div";
  stopPropagation?: boolean;
}) {
  const { locale, t } = useLocale();
  const detected = useMemo(() => detectTextLanguage(text), [text]);
  const showTranslate = useMemo(() => needsTranslation(text, locale), [text, locale]);

  const [showTranslated, setShowTranslated] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<Locale | null>(detected);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

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

  if (!showTranslate) {
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
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-sm">
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
      <LinkifiedText
        text={displayText}
        as={as}
        className={cn(className, showTranslated && "text-foreground")}
        stopPropagation={stopPropagation}
      />
    </div>
  );
}

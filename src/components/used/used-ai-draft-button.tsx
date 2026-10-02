"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UsedListingAiDraft } from "@/lib/used-listing-ai";
import { cn } from "@/lib/utils";

type UsedAiDraftButtonProps = {
  images: string[];
  category: string;
  productType: string;
  workTitle: string;
  region: string;
  saleType: "FIXED" | "AUCTION";
  isFree: boolean;
  partialTitle: string;
  partialDescription: string;
  disabled?: boolean;
  onApply: (draft: UsedListingAiDraft) => void;
};

export function UsedAiDraftButton({
  images,
  category,
  productType,
  workTitle,
  region,
  saleType,
  isFree,
  partialTitle,
  partialDescription,
  disabled,
  onApply,
}: UsedAiDraftButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const readyImages = images.filter((u) => u.startsWith("https://"));
  const canRun = readyImages.length > 0 && !disabled && !loading;

  async function runAi() {
    if (!canRun) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/used/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          images: readyImages,
          category,
          productType,
          workTitle,
          region,
          saleType,
          isFree,
          partialTitle,
          partialDescription,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        draft?: UsedListingAiDraft;
        error?: string;
      };

      if (!res.ok || !data.draft) {
        setError(data.error || t("used.sxacyed"));
        return;
      }

      onApply(data.draft);
      setMessage(t("used.s3bandm"));
    } catch {
      setError(t("used.s18n7wbo"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            {t("used.s1azzq9u")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t("used.google_gemini_api")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={cn(
            "shrink-0 rounded-full gap-1.5",
            "bg-violet-600 text-white hover:bg-violet-700"
          )}
          disabled={!canRun}
          onClick={() => void runAi()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? t("used.s1j2rjq4") : t("used.s1ucd1bn")}
        </Button>
      </div>

      {readyImages.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          {t("used.1_ai")}
        </p>
      )}
      {message && <p className="text-xs text-violet-700 dark:text-violet-300">{message}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

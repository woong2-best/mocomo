"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  gifTitleKeywords,
  giphyCreatorQuery,
  type CommentGifMeta,
} from "@/lib/giphy-meta";
import { openGiphySearch } from "@/lib/giphy-search-events";
import { cn } from "@/lib/utils";

export function GiphyCreatorSheet({
  open,
  meta,
  onClose,
}: {
  open: boolean;
  meta?: CommentGifMeta | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const creator = meta?.user ?? null;
  const tags = creator ? [] : gifTitleKeywords(meta?.title);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function search(query: string) {
    if (!query.trim()) return;
    onClose();
    openGiphySearch(query.trim());
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 animate-in fade-in-0 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("comments.gifCreator")}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{t("comments.gifCreator")}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label={t("comments.closeMedia")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {creator ? (
          <button
            type="button"
            onClick={() => search(giphyCreatorQuery(creator.username))}
            className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-muted/70"
            aria-label={t("comments.gifCreatorSearch", { username: creator.username })}
          >
            {creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatarUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {creator.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{creator.displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">@{creator.username}</span>
            </span>
          </button>
        ) : tags.length > 0 ? (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t("comments.gifTags")}</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => search(tag)}
                  className={cn(
                    "rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium",
                    "hover:bg-muted",
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {meta?.title?.trim() || t("comments.gifPowered")}
          </p>
        )}

        <p className="mt-4 text-right text-[10px] text-muted-foreground">{t("comments.gifPowered")}</p>
      </div>
    </div>
  );
}

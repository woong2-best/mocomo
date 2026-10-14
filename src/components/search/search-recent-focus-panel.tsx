"use client";

import { Clock, Loader2, X } from "lucide-react";
import { MAX_RECENT_SEARCHES_PER_SCOPE } from "@/lib/recent-searches";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export function SearchRecentFocusPanel({
  items,
  pending,
  filter,
  onPick,
  onRemove,
  className,
}: {
  items: string[];
  pending?: boolean;
  filter?: string;
  onPick: (term: string) => void;
  onRemove?: (term: string) => void;
  className?: string;
}) {
  const { t } = useLocale();
  const needle = filter?.trim().toLowerCase() ?? "";
  const visible = (needle
    ? items.filter((item) => item.toLowerCase().includes(needle))
    : items
  ).slice(0, MAX_RECENT_SEARCHES_PER_SCOPE);

  if (pending) {
    return (
      <div className={cn("flex items-center justify-center py-10", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <p className={cn("px-4 py-8 text-center text-sm text-muted-foreground", className)}>
        {needle ? t("search.rankingNoMatch") : t("search.recentEmpty")}
      </p>
    );
  }

  return (
    <div className={cn("p-3 sm:p-4", className)}>
      <p className="px-1 pb-2 text-xs font-semibold text-muted-foreground">{t("search.recentTitle")}</p>
      <ul className="space-y-0.5">
        {visible.map((term) => (
          <li key={term} className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onPick(term)}
              className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1.5 text-left hover:bg-muted/40"
            >
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:underline underline-offset-2">
                {term}
              </span>
            </button>
            {onRemove ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(term);
                }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                aria-label={t("search.recentRemoveAria", { term })}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

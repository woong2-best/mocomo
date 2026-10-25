"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { cultureWikiHubListHref } from "@/lib/culture-wiki-catalog";
import { cn } from "@/lib/utils";

export function AnimeHubPagination({
  currentPage,
  totalPages,
  genreParam,
  q,
}: {
  currentPage: number;
  totalPages: number;
  genreParam: string | null;
  q: string;
}) {
  const { t } = useLocale();

  if (totalPages <= 1) return null;

  const prevHref =
    currentPage > 1
      ? cultureWikiHubListHref({ genre: genreParam, q, page: currentPage - 1 })
      : null;
  const nextHref =
    currentPage < totalPages
      ? cultureWikiHubListHref({ genre: genreParam, q, page: currentPage + 1 })
      : null;

  return (
    <nav
      className="flex items-center justify-center gap-1 pt-2"
      aria-label={t("anime.paginationLabel")}
    >
      {prevHref ? (
        <Link
          href={prevHref}
          scroll
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/60 transition-colors"
          aria-label={t("anime.paginationPrev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 text-muted-foreground/40 cursor-not-allowed"
          aria-hidden
        >
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      <div className="flex items-center gap-1 px-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
          const href = cultureWikiHubListHref({ genre: genreParam, q, page: n });
          const active = n === currentPage;
          return (
            <Link
              key={n}
              href={href}
              scroll
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold tabular-nums transition-colors",
                active
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {n}
            </Link>
          );
        })}
      </div>

      {nextHref ? (
        <Link
          href={nextHref}
          scroll
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/60 transition-colors"
          aria-label={t("anime.paginationNext")}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 text-muted-foreground/40 cursor-not-allowed"
          aria-hidden
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

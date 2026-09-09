"use client";

import Link from "next/link";
import { ImageIcon, Loader2, Play } from "lucide-react";
import {
  searchRankingHref,
  type SidebarSearchRankingItem,
  type SidebarSearchRankingScope,
} from "@/lib/scoped-search-rank-shared";
import { cn } from "@/lib/utils";

const RANK_COLORS = [
  "text-[#e85d4a]",
  "text-[#e85d4a]",
  "text-foreground",
  "text-muted-foreground",
  "text-muted-foreground",
];

function itemHref(scope: SidebarSearchRankingScope, item: SidebarSearchRankingItem): string {
  return item.href ?? searchRankingHref(scope, item.label);
}

function MediaIndicators({
  imageCount = 0,
  videoCount = 0,
}: {
  imageCount?: number;
  videoCount?: number;
}) {
  if (imageCount < 1 && videoCount < 1) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground">
      {imageCount > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden />
          <span className="text-[11px] tabular-nums">{imageCount}</span>
        </span>
      )}
      {videoCount > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          <span className="text-[11px] tabular-nums">{videoCount}</span>
        </span>
      )}
    </span>
  );
}

export function SearchRankingFocusPanel({
  scope,
  items,
  pending,
  filter,
  onPick,
  className,
}: {
  scope: SidebarSearchRankingScope;
  items: SidebarSearchRankingItem[];
  pending?: boolean;
  filter?: string;
  onPick?: () => void;
  className?: string;
}) {
  const needle = filter?.trim().toLowerCase() ?? "";
  const visible = (needle
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(needle) ||
          item.authorName?.toLowerCase().includes(needle)
      )
    : items
  ).slice(0, 5);

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
        {needle ? "일치하는 검색어가 없습니다." : "아직 집계된 검색어가 없습니다."}
      </p>
    );
  }

  return (
    <ol className={cn("space-y-0.5 p-3 sm:p-4", className)}>
      {visible.map((item, index) => (
        <li key={item.id}>
          <Link
            href={itemHref(scope, item)}
            onClick={onPick}
            className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-muted/40"
          >
            <span
              className={cn(
                "w-5 shrink-0 text-base font-bold tabular-nums leading-none",
                RANK_COLORS[index] ?? "text-muted-foreground"
              )}
            >
              {item.rank}
            </span>

            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:underline underline-offset-2">
                {item.label}
              </span>
              <MediaIndicators imageCount={item.imageCount} videoCount={item.videoCount} />
            </span>

            {item.authorName ? (
              <span
                className="max-w-[4.5rem] shrink-0 truncate text-xs text-muted-foreground sm:max-w-[5.5rem]"
                title={item.authorName}
              >
                {item.authorName}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ol>
  );
}

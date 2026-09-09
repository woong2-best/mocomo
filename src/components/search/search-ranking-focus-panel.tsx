"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
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
    ? items.filter((item) => item.label.toLowerCase().includes(needle))
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
    <div className={cn("grid grid-cols-[1fr_auto] gap-3 p-3 sm:p-4", className)}>
      <ol className="min-w-0 space-y-2.5">
        {visible.map((item, index) => (
          <li key={item.id}>
            <Link
              href={searchRankingHref(scope, item.label)}
              onClick={onPick}
              className="group flex items-start gap-2.5 rounded-lg px-1 py-0.5 hover:bg-muted/40"
            >
              <span
                className={cn(
                  "w-5 shrink-0 text-base font-bold tabular-nums leading-snug",
                  RANK_COLORS[index] ?? "text-muted-foreground"
                )}
              >
                {item.rank}
              </span>
              <span className="min-w-0 text-sm font-medium text-foreground group-hover:underline underline-offset-2">
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex w-[4.5rem] shrink-0 flex-col gap-2 sm:w-20">
        {visible.map((item) => (
          <Link
            key={`chip-${item.id}`}
            href={searchRankingHref(scope, item.label)}
            onClick={onPick}
            className="flex h-9 items-center justify-center rounded-md border border-border/70 bg-muted/30 px-1 text-[10px] font-semibold text-foreground/90 hover:border-folk-terracotta/40 hover:bg-muted/60 truncate"
            title={item.label}
          >
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

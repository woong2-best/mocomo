"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "mocomo:recent-communities";
const MAX_RECENT = 12;

export type RecentCommunity = {
  slug: string;
  name: string;
  visitedAt: number;
};

function readRecent(): RecentCommunity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCommunity[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x?.slug && x?.name).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecent(items: RecentCommunity[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    /* ignore quota */
  }
}

/** 커뮤니티 서버 진입 시 최근 방문 기록 */
export function trackRecentCommunity(slug: string, name: string) {
  if (typeof window === "undefined" || !slug || !name) return;
  const prev = readRecent().filter((x) => x.slug !== slug);
  writeRecent([{ slug, name, visitedAt: Date.now() }, ...prev]);
}

export function removeRecentCommunity(slug: string) {
  writeRecent(readRecent().filter((x) => x.slug !== slug));
}

export function RecentCommunitiesBar() {
  const [items, setItems] = useState<RecentCommunity[]>([]);

  useEffect(() => {
    setItems(readRecent());
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto border border-border/70 bg-muted/25 rounded-md px-2.5 py-1.5 text-xs">
      <span className="shrink-0 font-semibold text-muted-foreground">최근 방문</span>
      <div className="flex items-center gap-1 min-w-0">
        {items.map((item) => (
          <span
            key={item.slug}
            className="inline-flex items-center gap-0.5 shrink-0 rounded-sm bg-background/80 border border-border/50 pl-2 pr-0.5 py-0.5"
          >
            <Link href={`/c/${item.slug}`} className="hover:underline underline-offset-2 max-w-[7rem] truncate">
              {item.name}
            </Link>
            <button
              type="button"
              aria-label={`${item.name} 최근 방문에서 제거`}
              className="p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                removeRecentCommunity(item.slug);
                setItems((prev) => prev.filter((x) => x.slug !== item.slug));
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

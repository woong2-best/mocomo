"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { HashtagSort } from "@/lib/hashtag-search";
import { useLocale } from "@/components/providers/locale-provider";
import { useClientPlatform } from "@/components/providers/client-platform-provider";

export function HashtagSearchTabs({
  tag,
  sort,
}: {
  tag: string;
  sort: HashtagSort;
}) {
  const { locale } = useLocale();
  const { isNativeApp } = useClientPlatform();
  const q = encodeURIComponent(`#${tag}`);

  const tabs: { id: HashtagSort; label: string }[] =
    locale === "en"
      ? [
          { id: "top", label: "Top" },
          { id: "latest", label: "Latest" },
        ]
      : locale === "ja"
        ? [
            { id: "top", label: "トップ" },
            { id: "latest", label: "最新" },
          ]
        : locale === "zh"
          ? [
              { id: "top", label: "热门" },
              { id: "latest", label: "最新" },
            ]
          : [
              { id: "top", label: "인기" },
              { id: "latest", label: "최신" },
            ];

  return (
    <nav
      className={cn(
        "sticky z-40 flex border-b border-border/80 bg-background/95 backdrop-blur-md -mx-4 px-4",
        isNativeApp ? "top-[calc(3.25rem+env(safe-area-inset-top,0px))]" : "top-14"
      )}
      aria-label={locale === "en" ? "Hashtag filters" : "해시태그 필터"}
    >
      {tabs.map((tab) => {
        const active = sort === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/search?q=${q}&sort=${tab.id}`}
            className={cn(
              "relative flex-1 py-3 text-center text-sm font-semibold transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-folk-cobalt" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

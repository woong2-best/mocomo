"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "info", label: "정보" },
  { id: "cosplayers", label: "관련 코스어" },
  { id: "goods", label: "굿즈" },
  { id: "community", label: "커뮤니티" },
];

export function AnimeTabs({ slug, activeTab }: { slug: string; activeTab: string }) {
  return (
    <nav className="flex border-b border-border/50 px-4 gap-1 overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={`/anime/${slug}?tab=${t.id}`}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
            activeTab === t.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";

const tabs = [
  { id: "info", label: "정보" },
  { id: "cosplayers", label: "관련 코스어" },
  { id: "goods", label: "굿즈" },
  { id: "community", label: "커뮤니티" },
];

export function AnimeTabs({
  slug,
  activeTab,
  showEditLink,
}: {
  slug: string;
  activeTab: string;
  showEditLink?: boolean;
}) {
  return (
    <nav className="flex border-b border-border/50 px-4 gap-1 overflow-x-auto items-center">
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
      <Link
        href={`/anime/${slug}/history`}
        className={cn(
          "px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex items-center gap-1",
          "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <History className="h-3.5 w-3.5" />
        기록
      </Link>
      {showEditLink && (
        <Link
          href={`/anime/${slug}/edit`}
          className="ml-auto px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary whitespace-nowrap"
        >
          편집
        </Link>
      )}
    </nav>
  );
}
